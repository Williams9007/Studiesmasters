<?php
// local/studiesmasters_sso/settings.php
// Admin settings: the shared secret must EXACTLY match MOODLE_SSO_SECRET in the StudiesMasters backend.

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_studiesmasters_sso', 'StudiesMasters SSO');
    $ADMIN->add('localplugins', $settings);

    $settings->add(new admin_setting_configpasswordunmask(
        'local_studiesmasters_sso/secret',
        'Shared SSO secret',
        'Must be identical to MOODLE_SSO_SECRET in the StudiesMasters backend .env file.',
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'local_studiesmasters_sso/defaultcourse',
        'Default course ID',
        'Moodle course ID students are redirected to when no ?course= parameter is supplied. Leave empty to send users to the dashboard.',
        '',
        PARAM_INT
    ));
}
