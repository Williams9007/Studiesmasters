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

// NOTE: no output here — the page identity ($PAGE->set_url) and the theme
// header must be established first; CSS is registered via $PAGE->requires->css.

// ---- 1. Resolve the current Moodle user to a StudiesMasters identity ------
$username = isset($USER->username) ? $USER->username : '';
$email    = isset($USER->email) ? $USER->email : '';
$isTeacher = (strpos($username, 'sm_t') === 0);
$role = $isTeacher ? 'teacher' : 'student';

// ---- Params + page identity (BEFORE any output) ---------------------------
$action  = optional_param('action', '', PARAM_RAW);   // '' | join | leave | start | end | regenerate
$sessionId = optional_param('session', '', PARAM_RAW); // session id for actions
$view    = optional_param('view', 'dashboard', PARAM_RAW); // dashboard | recordings | attendance
$PAGE->set_url(new moodle_url('/local/studiesmasters_virtualclass/index.php', array_filter(array(
    'action' => $action,
    'session' => $sessionId,
    'view' => ($view !== 'dashboard') ? $view : '',
))));
$PAGE->set_title(get_string('pluginname', 'local_studiesmasters_virtualclass'));

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
vc_header($role);

if ($action !== '') {
    // Perform a single signed backend call (join/leave/start/end/regenerate).
    $res = call_backend($backendUrl, $secret, $username, $email, $action, $sessionId);
    if ($res['error']) {
        echo '<div class="alert alert-danger">' . s($res['message']) . '</div>';
    } elseif ($action === 'join' && !empty($res['waiting'])) {
        // Waiting room: class not live yet — poll until the teacher starts it.
        vc_render_waiting($sessionId, $backendUrl, $secret, $username, $email);
    } elseif (!empty($res['meeting']['link'])) {
        // join (student or teacher) and start/regenerate all return the Meet
        // link — open it directly and keep a manual fallback anchor.
        echo '<script>window.open(' . json_encode($res['meeting']['link']) . ',"_blank");</script>';
        echo '<div class="alert alert-success">Opening your Google Meet class. <a target="_blank" rel="noopener" href="' . s($res['meeting']['link']) . '">Open again</a></div>';
    } else {
        echo '<div class="alert alert-success">Done.</div>';
    }
    echo '<p><a href="' . new moodle_url('/local/studiesmasters_virtualclass/index.php') . '" class="vc-btn vc-btn-outline">&laquo; Back to dashboard</a></p>';
} elseif ($view === 'recordings') {
    $res = call_backend($backendUrl, $secret, $username, $email, 'recordings', '');
    vc_render_recordings(isset($res['recordings']) ? $res['recordings'] : array());
} elseif ($view === 'attendance') {
    $res = call_backend($backendUrl, $secret, $username, $email, 'attendance', '');
    vc_render_attendance(isset($res['rows']) ? $res['rows'] : array(), $role);
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

    // Backend business error (e.g. 401 signature, 403 not enrolled) — surface
    // its message instead of silently showing "Done.". Two shapes exist:
    // { success:false, message|reason } and { status:>=400, message }.
    if ((isset($res['success']) && !$res['success'])
        || (isset($res['status']) && (int) $res['status'] >= 400)) {
        $msg = isset($res['message']) ? $res['message'] : (isset($res['reason']) ? $res['reason'] : 'The backend rejected this request.');
        return array('ok' => false, 'error' => true, 'message' => $msg, 'sessions' => array());
    }

    $sessions = isset($res['sessions']) ? $res['sessions'] : array();
    // A join/start/regenerate returns a single session + meeting link.
    if (isset($res['meeting'])) {
        $box = isset($res['session']) && is_array($res['session']) ? $res['session'] : array('sessionId' => $sessionId);
        if (!empty($res['meeting']['link'])) { $box['meetingLink'] = $res['meeting']['link']; }
        if (!empty($res['meeting']['status'])) { $box['meetingStatus'] = $res['meeting']['status']; }
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
    // Keep EVERY original key (waiting, meeting, rows, recordings, liveNow,
    // upcoming, history, ...) — dropping them broke the waiting-room branch and
    // made the recordings/attendance/status views render empty.
    $out = $res;
    $out['ok'] = true;
    $out['error'] = false;
    $out['message'] = '';
    $out['sessions'] = $sessions;
    return $out;
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

/**
 * Waiting room: the class is not live yet. Auto-reloads this same join URL
 * every 5s — each reload signs a FRESH request server-side, so the loop keeps
 * polling until the teacher starts the class, then the join response carries
 * the Meet link and it opens automatically.
 */
function vc_render_waiting($sessionId, $backendUrl, $secret, $username, $email) {
    $url = new moodle_url('/local/studiesmasters_virtualclass/index.php', array('action' => 'join', 'session' => $sessionId));
    echo html_writer::tag('div',
        'You are in the waiting room — the class has not started yet. '
        . 'This page checks again automatically and opens the Google Meet as soon as the teacher starts the class.',
        array('class' => 'alert alert-info'));
    echo html_writer::tag('div',
        html_writer::link($url, 'Check now', array('class' => 'btn btn-primary')),
        array('class' => 'mb-3'));
    echo '<script>setTimeout(function(){ window.location.href = ' . json_encode($url->out(false)) . '; }, 5000);</script>';
}

/** Unified dashboard: status banner + session cards (Meet link included). */
function vc_render_dashboard($res, $role) {
    render_sessions(isset($res['sessions']) ? $res['sessions'] : array(), $role);
}

/** Recording library cards with direct watch links. */
function vc_render_recordings($rows) {
    if (empty($rows) || count($rows) === 0) {
        echo html_writer::tag('div', 'No recordings yet — recordings appear here after a class ends.', array('class' => 'alert alert-info'));
        return;
    }
    foreach ($rows as $r) {
        $subject = isset($r['subject']) ? $r['subject'] : '';
        $grade   = isset($r['grade']) ? $r['grade'] : '';
        $teacher = isset($r['teacher']) ? $r['teacher'] : '';
        $date    = isset($r['date']) ? substr((string) $r['date'], 0, 10) : '';
        $title   = ($subject !== '' ? $subject : 'Virtual Class') . ($grade !== '' ? ' &mdash; ' . $grade : '');
        $lines = array();
        if ($teacher !== '') { $lines[] = 'Teacher: ' . $teacher; }
        if ($date !== '')    { $lines[] = 'Date: ' . $date; }
        $inner = html_writer::tag('div', $title, array('class' => 'card-title'));
        if ($lines) {
            $li = '';
            foreach ($lines as $ln) { $li .= html_writer::tag('li', $ln); }
            $inner .= html_writer::tag('ul', $li, array('class' => 'unlist'));
        }
        if (!empty($r['recordingLink'])) {
            $inner .= html_writer::link($r['recordingLink'], 'Watch recording', array('class' => 'btn btn-primary', 'target' => '_blank'));
        }
        echo html_writer::tag('div', $inner, array('class' => 'card card-block'));
    }
}

/** Attendance history table (teacher: roster counts; student: own record). */
function vc_render_attendance($rows, $role) {
    if (empty($rows) || count($rows) === 0) {
        echo html_writer::tag('div', 'No attendance records yet.', array('class' => 'alert alert-info'));
        return;
    }
    $isTeacher = ($role === 'teacher');
    $head = array('Class', 'Date', 'Time', 'Status');
    $head[] = $isTeacher ? 'Present' : 'My record';
    $data = array();
    foreach ($rows as $r) {
        $subject = isset($r['subject']) ? $r['subject'] : '';
        $grade   = isset($r['grade']) ? $r['grade'] : '';
        $teacher = isset($r['teacher']) ? $r['teacher'] : '';
        $cls     = ($subject !== '' ? $subject : 'Virtual Class') . ($grade !== '' ? ' — ' . $grade : '');
        if ($teacher !== '') { $cls .= ' (Teacher: ' . $teacher . ')'; }
        $date = isset($r['date']) ? substr((string) $r['date'], 0, 10) : '—';
        $time = (isset($r['startTime']) ? $r['startTime'] : '—') . ' – ' . (isset($r['endTime']) ? $r['endTime'] : '—');
        $status = isset($r['status']) ? $r['status'] : '—';
        if ($isTeacher) {
            $presence = isset($r['present']) ? ((int) $r['present']) . ' student(s)' : '—';
        } else {
            $presence = !empty($r['present'])
                ? 'Present' . (isset($r['duration']) && $r['duration'] ? ' · ' . (int) $r['duration'] . ' min' : '')
                : 'Absent';
        }
        $data[] = array(s($cls), s($date), s($time), s($status), s($presence));
    }
    echo html_writer::table(array('head' => $head, 'data' => $data));
}

/** Build a relative Moodle URL that triggers an action for a session. */
function action_link($action, $sid, $label, $btnClass) {
    $url = new moodle_url('/local/studiesmasters_virtualclass/index.php', array('action' => $action, 'session' => $sid));
    return html_writer::link($url, $label, array('class' => 'btn ' . $btnClass));
}

/**
 * Page chrome. Named vc_header/vc_footer because a userland `header()` would
 * collide with PHP's built-in header() ("Cannot redeclare header()" — fatal),
 * which is exactly why this page used to white-screen on load.
 * $role drives the nav so students/teachers see the right entry points.
 */
function vc_header($role) {
    global $PAGE, $OUTPUT;
    // Native Moodle chrome: register our CSS (lands in <head>) then emit the
    // theme header (navbar etc.) BEFORE any page output.
    $PAGE->requires->css(new moodle_url('/local/studiesmasters_virtualclass/styles.css'));
    echo $OUTPUT->header();
    echo html_writer::start_tag('div', array('class' => 'vc-page'));
    echo html_writer::start_tag('div', array('class' => 'page-header'));
    echo html_writer::tag('h3', 'StudiesMasters Virtual Classroom');
    echo html_writer::end_tag('div');
    $nav = html_writer::link(new moodle_url('/local/studiesmasters_virtualclass/index.php'), 'Dashboard', array('class' => 'vc-btn vc-btn-outline'));
    $nav .= ' ' . html_writer::link(new moodle_url('/local/studiesmasters_virtualclass/index.php', array('view' => 'recordings')), 'Recordings', array('class' => 'vc-btn vc-btn-outline'));
    $nav .= ' ' . html_writer::link(new moodle_url('/local/studiesmasters_virtualclass/index.php', array('view' => 'attendance')), 'Attendance', array('class' => 'vc-btn vc-btn-outline'));
    echo html_writer::tag('div', $nav, array('class' => 'vc-nav'));
}
function vc_footer() {
    global $OUTPUT;
    echo html_writer::end_tag('div'); // .vc-page
    echo $OUTPUT->footer();
}