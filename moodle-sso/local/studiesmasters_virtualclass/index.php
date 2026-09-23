<?php
// local/studiesmasters_virtualclass/index.php
//
// Moodle Virtual Classroom launcher. A logged-in Moodle user (student or
// teacher, authenticated via the StudiesMasters SSO) opens this page to see
// their upcoming/live virtual classes and, with one click, launch Google Meet.
//
// The backend (StudiesMasters MongoDB) is the single source of truth. This page
// only:
//   1. signs an SSO-style request with the shared secret,
//   2. calls the backend REST endpoints (/api/moodle/vclass/*),
//   3. renders the returned sessions and the appropriate buttons.
// Moodle NEVER creates classes or meetings.

require_once(__DIR__ . '/../../config.php');

global $USER;
require_login();

// Load the shared StudiesMasters design CSS so the page looks native.
echo '<link rel="stylesheet" href="' . (new moodle_url('/local/studiesmasters_virtualclass/styles.css')) . '">';

// ---- 1. Resolve the current Moodle user to a StudiesMasters identity ------
$username = isset($USER->username) ? $USER->username : '';
$email    = isset($USER->email) ? $USER->email : '';
$isTeacher = (strpos($username, 'sm_t') === 0);
$role = $isTeacher ? 'teacher' : 'student';

// ---- 2. Load plugin settings ----------------------------------------------
$secret     = get_config('local_studiesmasters_virtualclass', 'backendsecret');
$backendUrl = rtrim((string) get_config('local_studiesmasters_virtualclass', 'backendurl'), '/');
if (empty($secret) || empty($backendUrl)) {
    vc_header($role);
    echo '<div class="alert alert-warning">Virtual Classroom is not configured. Set the shared secret and backend URL under Site administration -&gt; Plugins -&gt; Local plugins.</div>';
    vc_footer();
    exit;
}

// ---- 3. Dispatch -----------------------------------------------------------------
$action  = optional_param('action', '', PARAM_RAW);   // '' | join | leave | start | end | regenerate
$sessionId = optional_param('session', '', PARAM_RAW); // session id for actions
$view    = optional_param('view', 'dashboard', PARAM_RAW); // dashboard | recordings | attendance

vc_header($role);

if ($action !== '') {
    // Perform a single signed backend call (join/leave/start/end/regenerate).
    $res = call_backend($backendUrl, $secret, $username, $email, $action, $sessionId);
    if ($res['error']) {
        echo '<div class="alert alert-danger">' . s($res['message']) . '</div>';
    } elseif ($action === 'join' && isset($res['waiting']) && $res['waiting']) {
        // Waiting room: class not live yet. Poll until it becomes live, then join.
        vc_render_waiting($sessionId, $backendUrl, $secret, $username, $email);
    } elseif ($action === 'join' && !empty($res['meeting']['link'])) {
        echo '<script>window.open(' . json_encode($res['meeting']['link']) . ',"_blank");</script>';
        echo '<div class="alert alert-success">Opening your Google Meet class. <a target="_blank" rel="noopener" href="' . s($res['meeting']['link']) . '">Open again</a></div>';
    } else {
        echo '<div class="alert alert-success">Done.</div>';
    }
    echo '<p><a href="' . new moodle_url('/local/studiesmasters_virtualclass/index.php') . '" class="vc-btn vc-btn-outline">&laquo; Back to dashboard</a></p>';
} elseif ($view === 'recordings') {
    $res = call_backend($backendUrl, $secret, $username, $email, 'recordings', '');
    vc_render_recordings($res['recordings']);
} elseif ($view === 'attendance') {
    $res = call_backend($backendUrl, $secret, $username, $email, 'attendance', '');
    vc_render_attendance($res['rows'], $role);
} else {
    // dashboard
    $res = call_backend($backendUrl, $secret, $username, $email, '', '');
    vc_render_status($res, $role);
    vc_render_dashboard($res, $role);
}

vc_footer();
exit;
// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Sign and call a backend /api/moodle/vclass endpoint with SSO-style params.
 * Returns an array with keys: ok, sessions, error, message.
 */
function call_backend($backendUrl, $secret, $username, $email, $action, $sessionId) {
    $timestamp = time();
    $nonce = bin2hex(random_bytes(16));
    $course = 0;
    $payload = "{$username}|{$email}|{$timestamp}|{$nonce}|{$course}";
    $signature = hash_hmac('sha256', $payload, $secret);

    $params = array(
        'username'  => $username,
        'email'     => $email,
        'timestamp' => $timestamp,
        'nonce'     => $nonce,
        'course'    => $course,
        'signature' => $signature,
    );

    // Decide endpoint + method based on action.
    $url = $backendUrl . '/api/moodle/vclass';
    $method = 'GET';
    switch ($action) {
        case 'join':  $url .= '/' . $sessionId . '/join';  $method = 'POST'; break;
        case 'leave': $url .= '/' . $sessionId . '/leave'; $method = 'POST'; break;
        case 'start': $url .= '/' . $sessionId . '/start'; $method = 'POST'; break;
        case 'end':   $url .= '/' . $sessionId . '/end';   $method = 'POST'; break;
        case 'regenerate': $url .= '/' . $sessionId . '/regenerate'; $method = 'POST'; break;
        case 'recordings':   $url .= '/recordings';   $method = 'GET'; break;
        case 'attendance':   $url .= '/attendance';   $method = 'GET'; break;
        case 'notifications': $url .= '/notifications'; $method = 'GET'; break;
        default:      $url .= '/dashboard';                  break; // unified dashboard (was /sessions)
    }

    // Attach signed params to the query string (backend reads them there).
    $sep = (strpos($url, '?') !== false) ? '&' : '?';
    $query = '';
    foreach ($params as $k => $v) {
        if ($query !== '') $query .= '&';
        $query .= rawurlencode($k) . '=' . rawurlencode((string) $v);
    }
    $finalUrl = $url . $sep . $query;

    $json = studiesmasters_http($finalUrl, $method);
    if ($json === null) {
        return array('ok' => false, 'error' => true, 'message' => 'Could not reach the StudiesMasters backend. Please try again later.', 'sessions' => array());
    }

    $res = json_decode($json, true);
    if (!is_array($res)) {
        return array('ok' => false, 'error' => true, 'message' => 'Unexpected response from the backend.', 'sessions' => array());
    }

    $sessions = isset($res['sessions']) ? $res['sessions'] : array();
    // A join/start returns a single session + meeting link.
    if (isset($res['session']) && isset($res['meeting'])) {
        $box = $res['session'];
        if (!empty($res['meeting']['link'])) { $box['meetingLink'] = $res['meeting']['link']; }
        $sessions = array($box);
    }
    // The unified /dashboard wrapper nests liveNow/upcoming/history one level deep.
    if (isset($res['liveNow']) || isset($res['upcoming']) || isset($res['history'])) {
        $sessions = array_merge(
            isset($res['liveNow']) ? $res['liveNow'] : array(),
            isset($res['upcoming']) ? $res['upcoming'] : array(),
            isset($res['history']) ? $res['history'] : array()
        );
    }
    return array('ok' => true, 'error' => false, 'message' => '', 'sessions' => $sessions);
}

/** Minimal didactic HTTP helper (GET/POST, 8s timeout). Returns body or null. */
function studiesmasters_http($url, $method = 'GET') {
    $timeout = 8;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        $headers = array('Accept: application/json');
        if ($method === 'POST') { $headers[] = 'Content-Type: application/x-www-form-urlencoded'; }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 2);
        if ($method === 'POST') { curl_setopt($ch, CURLOPT_POST, true); }
        $out = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        return ($err === '' && $out !== false) ? $out : null;
    }
    $ctx = stream_context_create(array('http' => array('timeout' => $timeout)));
    $out = @file_get_contents($url, false, $ctx);
    return ($out === false) ? null : $out;
}
/** Render the session cards with role-appropriate buttons. */
function render_sessions($sessions, $role) {
    if (empty($sessions) || count($sessions) === 0) {
        echo html_writer::tag('div', 'You have no upcoming virtual classes right now.', array('class' => 'alert alert-info'));
        return;
    }
    foreach ($sessions as $s) {
        $subject = isset($s['subject']) ? $s['subject'] : '';
        $grade   = isset($s['grade']) ? $s['grade'] : '';
        $teacher = isset($s['teacher']) ? $s['teacher'] : '';
        $date    = isset($s['date']) ? $s['date'] : '';
        $start   = isset($s['startTime']) ? $s['startTime'] : '';
        $end     = isset($s['endTime']) ? $s['endTime'] : '';
        $status  = isset($s['status']) ? $s['status'] : '';
        $sid     = isset($s['sessionId']) ? $s['sessionId'] : '';
        $meetingStatus = isset($s['meetingStatus']) ? $s['meetingStatus'] : '';
        $link    = isset($s['meetingLink']) ? $s['meetingLink'] : '';

        $title = ($subject !== '' ? $subject : 'Virtual Class');
        if ($grade !== '') { $title .= ' &mdash; ' . $grade; }

        $lines = array();
        if ($teacher !== '')     { $lines[] = 'Teacher: ' . $teacher; }
        if ($date !== '')        { $lines[] = 'Date: ' . $date; }
        if ($start !== '' || $end !== '') { $lines[] = 'Time: ' . ($start !== '' ? $start : '--') . ' &ndash; ' . ($end !== '' ? $end : '--'); }
        $lines[] = 'Status: ' . $status . ($meetingStatus !== '' ? ' (meeting: ' . $meetingStatus . ')' : '');

        $inner = html_writer::tag('div', $title, array('class' => 'card-title'));
        $listItems = '';
        foreach ($lines as $ln) { $listItems .= html_writer::tag('li', $ln); }
        $inner .= html_writer::tag('ul', $listItems, array('class' => 'unlist'));

        // Buttons depend on role + status.
        $buttons = '';
        if ($role === 'teacher') {
            if ($status === 'scheduled' || $status === 'live') {
                $buttons .= action_link('start', $sid, $status === 'live' ? 'Re-open Class' : 'Start / Open Class', 'btn-primary');
                $buttons .= ' ' . action_link('join', $sid, 'Join Meet', 'btn-secondary');
                $buttons .= ' ' . action_link('end', $sid, 'End Class', 'btn-danger');
                if ($meetingStatus !== '' && $meetingStatus !== 'ready') {
                    $buttons .= ' ' . action_link('regenerate', $sid, 'Fix Meet Link', 'btn-secondary');
                }
            }
        } else {
            if ($status === 'live' || $status === 'scheduled') {
                $buttons .= action_link('join', $sid, 'Join Virtual Class', 'btn-primary');
                $buttons .= ' ' . action_link('leave', $sid, 'I left the class', 'btn-secondary');
            }
        }
        // If we hold a freshly-launched Meet link, surface it directly.
        if ($link !== '') {
            $buttons .= ' ' . html_writer::link($link, 'Open Meet Link', array('class' => 'btn btn-info', 'target' => '_blank'));
        }
        $inner .= $buttons;

        echo html_writer::tag('div', $inner, array('class' => 'card card-block'));
    }
}

/** Render a "visible + healthy" status banner from dashboard data. */
function vc_render_status($res, $role) {
    $live = isset($res['liveNow']) ? count($res['liveNow']) : 0;
    $up = isset($res['upcoming']) ? count($res['upcoming']) : 0;
    $hist = isset($res['history']) ? count($res['history']) : 0;
    echo html_writer::tag('div', "Connected as {$role}. Live now: {$live} · Upcoming: {$up} · Past: {$hist}.", array('class' => 'alert alert-success'));
}

/** Build a relative Moodle URL that triggers an action for a session. */
function action_link($action, $sid, $label, $btnClass) {
    $url = new moodle_url('/local/studiesmasters_virtualclass/index.php', array('action' => $action, 'session' => $sid));
    return html_writer::link($url, $label, array('class' => 'btn ' . $btnClass));
}

function header() {
    echo html_writer::start_tag('div', array('class' => 'page-header'));
    echo html_writer::tag('h3', 'StudiesMasters Virtual Classroom');
    echo html_writer::end_tag('div');
}
function footer() {
    echo html_writer::end_tag('div');
}