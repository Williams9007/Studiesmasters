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
        $response = @file_get_contents($url, false, stream_context_create(array(
            'http' => array('timeout' => 8, 'ignore_errors' => true),
        )));
        $data = $response ? json_decode($response, true) : null;
        if (!is_array($data) || !empty($data['error'])) {
            return $this->content = html_writer::div(get_string('backend_unreachable', 'block_studiesmasters_virtualclass'), 'alert alert-warning');
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
                $date = !empty($item['date']) ? userdate(strtotime($item['date']), get_string('strftimedaydate')) : '';
                $time = trim(($item['startTime'] ?? '') . '–' . ($item['endTime'] ?? ''), '–');
                $label = trim(($item['subject'] ?? 'Class') . ' · ' . $date . ' · ' . $time);
                $html .= html_writer::tag('li', s($label));
            }
            $html .= '</ul>';
        }
        $html .= html_writer::end_div();
        $this->content = $html;
        return $this->content;
    }
}
