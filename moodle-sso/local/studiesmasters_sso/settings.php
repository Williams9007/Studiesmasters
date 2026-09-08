<?php
// local/studiesmasters_sso/settings.php
// Admin settings for the enterprise SSO plugin.

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
        'local_studiesmasters_sso/backendverify',
        'StudiesMasters backend verify URL',
        'StudiesMasters backend endpoint that verifies the one-time nonce and returns ' .
        'authoritative profile data. e.g. https://studiesmasters-backend.onrender.com/api/moodle/sso/verify',
        'https://studiesmasters-backend.onrender.com/api/moodle/sso/verify',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configtext(
        'local_studiesmasters_sso/defaultcourse',
        'Default course ID',
        'Moodle course ID students are redirected to when no ?course= parameter is supplied. Leave empty to send users to the dashboard.',
        '',
        PARAM_INT
    ));
}
