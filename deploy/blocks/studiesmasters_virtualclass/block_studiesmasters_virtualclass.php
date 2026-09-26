<?php
// studiesmasters_virtualclass dashboard block
class block_studiesmasters_virtualclass extends block_base {
    public function init() {
        $this->title = get_string('pluginname', 'block_studiesmasters_virtualclass');
    }

    public function get_content() {
        global $USER;
        $username = (string) ($USER->username ?? '');
        if (strpos($username, 'sm_s_') !== 0 && strpos($username, 'sm_t_') !== 0) {
            return $this->content = '';
        }

        $secret = (string) get_config('local_studiesmasters_virtualclass', 'backendsecret');
        $backend = rtrim((string) get_config('local_studiesmasters_virtualclass', 'backendurl'), '/');
        if ($secret === '' || $backend === '') {
            return $this->content = html_writer::div(get_string('notconfigured', 'block_studiesmasters_virtualclass'), 'alert alert-warning');
        }

        $timestamp = time();
        $nonce = bin2hex(random_bytes(16));
        $email = (string) ($USER->email ?? '');
        $payload = "{$username}|{$email}|{$timestamp}|{$nonce}|0";
        $params = array(
            'username' => $username,
            'email' => $email,
            'timestamp' => $timestamp,
            'nonce' => $nonce,
            'course' => 0,
            'signature' => hash_hmac('sha256', $payload, $secret),
        );
        $url = $backend . '/api/moodle/vclass/dashboard?' . http_build_query($params);
        // cURL first, streams as fallback — some hosts disable allow_url_fopen,
        // which made this block silently report "backend unreachable".
        $response = vc_block_http_get($url);
        $data = ($response === null || $response === '') ? null : json_decode($response, true);
        if (!is_array($data)) {
            return $this->content = html_writer::div(get_string('backend_unreachable', 'block_studiesmasters_virtualclass'), 'alert alert-warning');
        }
        if (!empty($data['error']) || (isset($data['reason']) && $data['reason'] === 'unknown_user')
                || (isset($data['status']) && (int) $data['status'] >= 400)) {
            // unlinked account — say so, instead of implying an empty timetable.
            $msg = ($data['reason'] ?? '') === 'unknown_user'
                ? get_string('account_not_linked', 'block_studiesmasters_virtualclass')
                : get_string('backend_unreachable', 'block_studiesmasters_virtualclass');
            return $this->content = html_writer::div($msg, 'alert alert-warning');
        }

        $courses = $data['courses'] ?? [];
        $items = array_merge($data['liveNow'] ?? array(), $data['upcoming'] ?? array());
        $html = html_writer::start_div('sm-dashboard-block');
        $html .= html_writer::link(new moodle_url('/local/studiesmasters_virtualclass/index.php'), get_string('open_virtualclassroom', 'local_studiesmasters_virtualclass'), array('class' => 'btn btn-primary mb-3'));
        if ($courses) {
            $html .= '<h6 class="mb-2"><strong>My courses</strong></h6><ul class="sm-dashboard-courses">';
            foreach ($courses as $course) {
                $label = trim(($course['code'] ?? '') . ' · ' . ($course['subject'] ?? 'Class') . ' · ' . ($course['grade'] ?? ''));
                $html .= html_writer::tag('li', s($label));
            }
            $html .= '</ul>';
        }
        if (!$items) {
            $html .= html_writer::div(get_string('no_classes', 'block_studiesmasters_virtualclass'), 'alert alert-info');
        } else {
            $html .= '<ul class="sm-dashboard-classes">';
            foreach (array_slice($items, 0, 5) as $item) {
                $islive = !empty($item['status']) && $item['status'] === 'live';
                // The backend sends an ISO date; parse it as a DATE (not a raw
                // timestamp in the server TZ) so the displayed day matches the
                // scheduled day instead of shifting by a day near midnight.
                $rawdate = (string)($item['date'] ?? '');
                $day = $rawdate !== '' ? substr($rawdate, 0, 10) : '';
                $date = $day !== '' ? userdate(strtotime($day . ' 00:00:00'), get_string('strftimedaydate')) : '';
                $time = trim(($item['startTime'] ?? '') . '–' . ($item['endTime'] ?? ''), '–');
                $label = trim(($item['subject'] ?? get_string('pluginname', 'block_studiesmasters_virtualclass'))
                    . ($item['grade'] ?? '' !== '' ? ' · ' . $item['grade'] : '')
                    . ' · ' . $date . ' · ' . $time);
                $attrs = array('class' => $islive ? 'sm-vc-live' : '');
                $html .= html_writer::tag('li', s($label), $attrs);
            }
            $html .= '</ul>';
        }
        $html .= html_writer::end_div();
        $this->content = $html;
        return $this->content;
    }
}

/**
 * Minimal HTTP GET returning the body, or null on failure. Uses cURL when
 * available and falls back to PHP streams, so the block still works on hosts
 * with allow_url_fopen disabled (the previous file_get_contents-only version
 * reported "backend unreachable" there).
 */
function vc_block_http_get($url) {
    $timeout = 8;
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
    $ctx = stream_context_create(array('http' => array('timeout' => $timeout, 'ignore_errors' => true)));
    $out = @file_get_contents($url, false, $ctx);
    return ($out === false) ? null : $out;
}
