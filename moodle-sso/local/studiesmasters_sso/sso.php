<?php
// local/studiesmasters_sso/sso.php
//
// The Moodle (Service Provider) side of the enterprise StudiesMasters SSO.
//
// New wire contract (must match services/moodle/generateSSO.js exactly):
//   GET /local/studiesmasters_sso/sso.php
//   Query params (minimal, identity + replay-guard + redirect):
//     username   = stable Moodle username derived from the immutable Mongo id
//                  (e.g. sm_s_<hex>). NEVER email — email stays editable.
//     email      = trim(email)                 (identity-safe; update-only)
//     timestamp  = epoch seconds (10 digits; ±300s tolerance)
//     nonce      = one-time random token (hex) issued + consumed by the backend
//     course     = positive int Moodle course id, else 0 (dashboard)
//     signature  = strtolower(hex(HMAC_SHA256(payload, SECRET)))
//   Payload = "username|email|timestamp|nonce|course"
//
// MoLE: this plugin only (a) verifies the signature locally, (b) calls the
// backend verify endpoint to enforce the one-time nonce and fetch authoritative
// profile data, (c) finds-or-creates the Moodle user (stable username key),
// (d) starts a session and redirects. It never trusts rich profile data in the
// URL. Account create/update/enroll/suspend is the backend's job.
require_once(__DIR__ . '/../../config.php');

$secret = get_config('local_studiesmasters_sso', 'secret');
if (empty($secret)) {
    throw new \moodle_exception('notconfigured', 'local_studiesmasters_sso');
}

// ---- 1. Read params (normalized exactly like the backend) ----
$username    = trim(required_param('username', PARAM_RAW));
$email    = trim(required_param('email', PARAM_RAW));
$timestamp   = required_param('timestamp', PARAM_INT);
$nonce       = trim(required_param('nonce', PARAM_RAW));
$course      = optional_param('course', 0, PARAM_INT);
$sig         = strtolower(trim(required_param('signature', PARAM_RAW)));

// ---- 2. Freshness (±5 min) ----
if (abs(time() - $timestamp) > 300) {
    throw new \moodle_exception('tokenexpired', 'local_studiesmasters_sso');
}

// ---- 3c. Local signature verification (timing-safe) ----
$payload  = "{$username}|{$email}|{$timestamp}|{$nonce}|{$course}";
$expected = strtolower(hash_hmac('sha256', $payload, $secret));
if (!hash_equals($expected, $sig)) {
    throw new \moodle_exception('badsignature', 'local_studiesmasters_sso');
}

// ---- 4. Ask the backend to enforce the one-time nonce + fetch profile ----
// The backend is the only authority. If it is reachable, it atomically consumes
// the nonce (replay protection) and returns authoritative fields.
$backendProfile = null;
$verifyUrl = get_config('local_studiesmasters_sso', 'backendverify');
if (!empty($verifyUrl)) {
    $q = http_build_query(array(
        'username'    => $username,
        'email'       => $email,
        'timestamp'   => $timestamp,
        'nonce'       => $nonce,
        'course'      => $course,
        'signature'   => $sig,
    ));
    $joined = (strpos($verifyUrl, '?') !== false ? $verifyUrl . '&' : $verifyUrl . '?') . $q;
    $json = studiesmasters_http_get($joined);
    if ($json !== null) {
        $res = json_decode($json, true);
        if (is_array($res) && array_key_exists('success', $res)) {
            if ($res['success'] === true) {
                $backendProfile = $res;           // authoritative identity + profile
            } else {
                // Nonce/already-consumed or bad signature etc.
                throw new \moodle_exception('replayed', 'local_studiesmasters_sso');
            }
        }
    }
    if ($backendProfile === null) {
        // Backend unreachable -> we already HMAC-verified, but we cannot enforce
        // the one-time nonce. Fail closed so replay protection holds.
        throw new \moodle_exception('backendunavailable', 'local_studiesmasters_sso');
    }
}

// ---- 5. Resolve, or create, the Moodle user by STABLE username -------------
// The username is the permanent StudiesMasters-derived id (never email).
$user = core_user::get_user_by_username($username);
if (!$user) {
    // Backend-provided identity (name) is authoritative when present.
    $first = isset($backendProfile['profile']['fullName'])
        ? trim(explode(' ', $backendProfile['profile']['fullName'])[0]) : '';
    $last  = '';

    $newUser = new stdClass();
    $newUser->auth       = 'manual';
    $newUser->confirmed  = 1;
    $newUser->mnethostid = $CFG->mnet_hostid;
    $newUser->username   = $username;          // stable, id-derived
    $newUser->email      = $email;             // update-only copy
    $newUser->firstname  = $first;
    $newUser->lastname   = $last;
    $newUser->password   = '';                 // SSO-only; no local password
    $newUser->idnumber   = isset($backendProfile['principalId']) ? $backendProfile['principalId'] : '';
    $newUser->city       = '';
    $newUser->country    = '';
    $newUser->lang       = $CFG->lang;
    $newUser->maildisplay    = 1;
    $newUser->mailformat     = 1;
    $newUser->maildigest     = 0;
    $newUser->autosubscribe  = 1;
    $newUser->timezone       = 99;
    $newUser->firstaccess    = 0;
    $newUser->lastaccess     = 0;
    $newUser->lastlogin      = 0;
    $newUser->currentlogin   = 0;
    $newUser->skippedlifetime = 0; // silence notice on strict Moodle versions.

    $userId = $DB->insert_record('user', $newUser);
    if (!$userId) {
        throw new \moodle_exception('couldnotcreate', 'local_studiesmasters_sso');
    }
    $user = $DB->get_record('user', ['id' => $userId], '*', MUST_EXIST);
}

// ---- 5b. Sync mutable profile fields (authoritative, from the backend) ----
if ($user->email !== $email) { $user->email = $email; }
if (isset($backendProfile['profile']['fullName'])) {
    $parts = preg_split('/\s+/', trim($backendProfile['profile']['fullName']));
    if (!empty($parts)) {
        $f = array_shift($parts);
        $l = implode(' ', $parts);
        if ($user->firstname !== $f) { $user->firstname = $f; }
        if ($user->lastname !== $l)  { $user->lastname  = $l; }
    }
}
update_user($user);

// ---- 5c. Store backend profile into custom profile fields (optional) ----
$pf = isset($backendProfile['profile']) ? $backendProfile['profile'] : array();
if (isset($pf['curriculum'])) studiesmasters_set_profile_field($user->id, 'curriculum', $pf['curriculum']);
if (isset($pf['grade']))      studiesmasters_set_profile_field($user->id, 'grade',      $pf['grade']);
if (isset($pf['package']))    studiesmasters_set_profile_field($user->id, 'package',    $pf['package']);
if (isset($pf['subjects']) && is_array($pf['subjects'])) {
    studiesmasters_set_profile_field($user->id, 'subjects', implode(',', $pf['subjects']));
}

// ---- 6. Log the user in ----
\core\session\manager::login_user($user);
$USER = $user;

// ---- 7. Redirect to course (if enrolled) or dashboard ----
$targetCourseId = $course;
if (!$targetCourseId) { $targetCourseId = (int) get_config('local_studiesmasters_sso', 'defaultcourse'); }
if ($targetCourseId) {
    try {
        $courseObj = get_course($targetCourseId);
        $context   = context_course::instance($targetCourseId);
        if ($courseObj && is_enrolled($context, $user->id)) {
            redirect(new moodle_url('/course/view.php', ['id' => $targetCourseId]));
        }
    } catch (\Exception $e) { /* fall through to dashboard */ }
}
redirect(new moodle_url('/my/'));

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Minimal HTTP GET returning body, or null on failure. Uses cURL when available
 * else PHP streams (allows us to reach the backend without relying on plugins).
 */
function studiesmasters_http_get($url) {
    $timeout = 5;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 2);
        $out = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        return ($err === '' && $out !== false) ? $out : null;
    }
    $ctx = stream_context_create(array('http' => array('timeout' => $timeout)));
    $out = @file_get_contents($url, false, $ctx);
    return ($out === false) ? null : $out;
}

/**
 * Upsert a string into a custom profile field by shortname (defensive, idempotent).
 */
function studiesmasters_set_profile_field($userid, $shortname, $value) {
    global $DB;
    if ($shortname === '' || $value === '') { return; }
    $field = $DB->get_record('user_info_field', ['shortname' => $shortname]);
    if (!$field) { return; } // Field not defined; skip.
    $existing = $DB->get_record('user_info_data', ['userid' => $userid, 'fieldid' => $field->id]);
    if ($existing) {
        if ($existing->data !== $value) {
            $existing->data = $value; $existing->dataformat = 0;
            $DB->update_record('user_info_data', $existing);
        }
    } else {
        $record = new stdClass();
        $record->userid = $userid; $record->fieldid = $field->id;
        $record->data = $value; $record->dataformat = 0;
        $DB->insert_record('user_info_data', $record);
    }
}