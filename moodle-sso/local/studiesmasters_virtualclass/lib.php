<?php
// local/studiesmasters_virtualclass/lib.php
//
// Navigation registration. Local plugins have NO automatic presence in
// Moodle's UI — without this callback the plugin is only reachable by typing
// /local/studiesmasters_virtualclass/index.php directly. Moodle builds the
// navigation drawer by invoking local_<pluginname>_extend_navigation() from
// each plugin's lib.php (Moodle dev docs -> Local plugins -> "Global plugin
// functions", File path /lib.php; sibling hook extend_settings_navigation
// documented in core's local/readme.txt).

defined('MOODLE_INTERNAL') || die();

/**
 * Add the Virtual Classroom entry to the navigation drawer.
 *
 * Only SSO-provisioned accounts see the entry (sm_s_* students / sm_t_*
 * teachers): every backend call is authorised by the signed Moodle username,
 * so a link for any other account would only dead-end at an unknown_user
 * error. Admins can still reach the page via the direct URL.
 *
 * @param global_navigation $navigation
 */
function local_studiesmasters_virtualclass_extend_navigation(global_navigation $navigation) {
    global $USER;
    $username = (string) ($USER->username ?? '');
    if (strncmp($username, 'sm_s_', 5) !== 0 && strncmp($username, 'sm_t_', 5) !== 0) {
        return;
    }
    $navigation->add(
        get_string('pluginname', 'local_studiesmasters_virtualclass'),
        new moodle_url('/local/studiesmasters_virtualclass/index.php')
    );
}
