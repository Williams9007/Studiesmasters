<?php
// local/studiesmasters_virtualclass/settings.php
// Admin settings for the Virtual Classroom launcher plugin.
//
// Requires:
//   - "Shared SSO secret" identical to MOODLE_SSO_SECRET in the backend .env
//   - "Backend base URL" = https://studiesmasters-backend.onrender.com

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_studiesmasters_virtualclass', 'StudiesMasters Virtual Classroom');
    $ADMIN->add('localplugins', $settings);

    $settings->add(new admin_setting_configpasswordunmask(
        'local_studiesmasters_virtualclass/backendsecret',
        'Shared SSO secret (backend)',
        'Must be identical to MOODLE_SSO_SECRET in the StudiesMasters backend .env file. Used to sign the requests this plugin sends to the backend.',
        ''
    ));

    // Backend base URL (without trailing slash) used to build the REST calls.
    $settings->add(new admin_setting_configtext(
        'local_studiesmasters_virtualclass/backendurl',
        'StudiesMasters backend base URL',
        'The backend base URL that powers virtual classes, e.g. https://studiesmasters-backend.onrender.com',
        'https://studiesmasters-backend.onrender.com',
        PARAM_URL
    ));

    // The slug/path the virtual classroom page is mounted at (relative to the
    // Moodle URL). Default keeps it short and uncluttered.
    $settings->add(new admin_setting_configtext(
        'local_studiesmasters_virtualclass/path',
        'Virtual Classroom path',
        'Relative path under the Moodle site where the launcher listens, e.g. virtualclassroom. Access via /local/studiesmasters_virtualclass/index.php.',
        '/local/studiesmasters_virtualclass/index.php',
        PARAM_RAW
    ));
}