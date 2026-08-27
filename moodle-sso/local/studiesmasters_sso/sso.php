<?php
// local/studiesmasters_sso/sso.php
//
// The Moodle (Service Provider) side of the StudiesMasters Single Sign-On
// handshake. This implements the SAME wire contract produced by the
// StudiesMasters Node.js backend in routes/moodleRoutes.js -> buildSsoUrl().
//
// Wire contract (source of truth — must match buildSsoUrl() exactly):
//   GET /local/studiesmasters_sso/sso.php
//   Query params: username, email, timestamp, course, signature
//                 (+ optional firstname, lastname, role)
//   Normalization (pre-signing, done by the backend):
//     username = strtolower(trim(username))         -- stable Moodle username
//     email    = trim(email)                          -- NOT lowercased
//     timestamp = epoch seconds (10 digits)
//     course   = positive int Moodle course id, else 0 (dashboard)
//   Payload    = "{username}|{email}|{timestamp}|{course}"  (normalized, as sent)
//   Signature  = strtolower(hex(HMAC_SHA256(payload, MOODLE_SSO_SECRET)))
//   Lifetime   = |time() - timestamp| <= 300 (±5 min clock tolerance)
//   Success    = issue a Moodle session + redirect to course/dashboard
//   Failure    = moodle_exception (no session created)
//
// Flow (invoked from the backend endpoint GET /api/moodle/sso):
//   1. Backend mints a signed redirect URL and returns it to the frontend.
//   2. Frontend opens that URL in a new tab (window.open(..., "_blank")).
//   3. This endpoint verifies the HMAC signature + expiry.
//   4. Finds the user in Moodle's MariaDB (mdl_user) by username then email;
//      if missing, creates them (SSO-only, no password set/synced).
//   5. Starts a Moodle session for the user.
//   6. Redirects to the requested course (if enrolled) or the dashboard (/my/).
//
// No password is ever synced or sent — the signed HMAC URL replaces the
// password, avoiding bcrypt hash-format mismatches and plaintext copies.

require_once(__DIR__ . '/../../config.php');

$secret = get_config('local_studiesmasters_sso', 'secret');
if (empty($secret)) {
    throw new \moodle_exception('notconfigured', 'local_studiesmasters_sso');
}

// --- 1. Read normalized params exactly as the backend sent them ---
$username  = strtolower(trim(required_param('username', PARAM_RAW)));
$email     = trim(required_param('email', PARAM_RAW));
$timestamp = required_param('timestamp', PARAM_INT);
$course    = optional_param('course', 0, PARAM_INT);
$sig       = strtolower(trim(required_param('signature', PARAM_RAW)));

// --- 2. Verify timestamp freshness (±300s). Rejects expired / future-dated tokens ---
if (abs(time() - $timestamp) > 300) {
    throw new \moodle_exception('tokenexpired', 'local_studiesmasters_sso');
}

// --- 3. Recompute the HMAC-SHA256 over "{username}|{email}|{timestamp}|{course}" ---
$payload   = "{$username}|{$email}|{$timestamp}|{$course}";
$expected  = strtolower(hash_hmac('sha256', $payload, $secret));
if (!hash_equals($expected, $sig)) {
    throw new \moodle_exception('badsignature', 'local_studiesmasters_sso');
}

// --- 4. Find or create the Moodle user (by username first, then email) ---
$user = core_user::get_user_by_username($username);
if (!$user) {
    $user = core_user::get_user_by_email($email);
}

if (!$user) {
    // Create a new mdl_user row directly. The username is the lowercased email
    // (stable + unique). auth='manual' with an EMPTY password makes this an
    // SSO-only account — no password is set or synced, which avoids bcrypt
    // hash-format mismatches and never stores plaintext. (Standard Moodle pattern.)
    $newUser = new stdClass();
    $newUser->auth          = 'manual';
    $newUser->confirmed      = 1;
    $newUser->mnethostid     = $CFG->mnet_hostid;
    $newUser->username       = $username;
    $newUser->email          = $email;
    $newUser->firstname      = isset($_GET['firstname']) ? $_GET['firstname'] : '';
    $newUser->lastname       = isset($_GET['lastname'])  ? $_GET['lastname']  : '';
    $newUser->password       = '';        // SSO-only; no local password.
    $newUser->idnumber       = '';
    $newUser->city           = '';
    $newUser->country        = '';
    $newUser->lang           = $CFG->langotherroot ?? $CFG->lang;
    $newUser->maildisplay    = true;
    $newUser->mailformat     = 1;
    $newUser->maildigest     = 0;
    $newUser->autosubscribe  = 1;
    $newUser->timezone       = 99;
    $newUser->firstaccess    = 0;
    $newUser->lastaccess     = 0;
    $newUser->lastlogin      = 0;
    $newUser->currentlogin   = 0;

    $userId = $DB->insert_record('user', $newUser);
    if (!$userId) {
        throw new \moodle_exception('couldnotcreate', 'local_studiesmasters_sso');
    }
    $user = $DB->get_record('user', ['id' => $userId], '*', MUST_EXIST);
}

// --- 4b. Sync optional profile fields from the token (idempotent) ---
if (isset($_GET['firstname']) && $_GET['firstname'] !== '' && $user->firstname !== $_GET['firstname']) {
    $user->firstname = $_GET['firstname'];
}
if (isset($_GET['lastname']) && $_GET['lastname'] !== '' && $user->lastname !== $_GET['lastname']) {
    $user->lastname = $_GET['lastname'];
}
if ($user->email !== $email) {
    $user->email = $email;
}
// update_user() applies Moodle's fullname / ML consistency rules.
update_user($user);

// --- 5. Log the user into Moodle (creates the session cookie) ---
\core\session\manager::login_user($user);
$USER = $user;

// --- 6. Redirect to the requested course (if valid + enrolled) or the dashboard ---
$targetCourseId = $course;
if (!$targetCourseId) {
    $targetCourseId = (int) get_config('local_studiesmasters_sso', 'defaultcourse');
}
if ($targetCourseId) {
    try {
        $courseObj = get_course($targetCourseId);
        $context   = context_course::instance($targetCourseId);
        if ($courseObj && is_enrolled($context, $user->id)) {
            redirect(new moodle_url('/course/view.php', ['id' => $targetCourseId]));
        }
    } catch (\Exception $e) {
        // Fall through to the dashboard if the course is invalid or user is not enrolled.
    }
}

redirect(new moodle_url('/my/'));
