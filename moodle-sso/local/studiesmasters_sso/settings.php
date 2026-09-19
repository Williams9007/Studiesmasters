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

    // ---- Main website name sync (studiesmasters_mainwebsite_sync) ---- //
    $settings->add(new admin_setting_configtext(
        'local_studiesmasters_sso/mainwebsiteurl',
        'Main website sync URL',
        'StudiesMasters main website endpoint that returns the real user name for a given email. ' .
        'The Moodle plugin calls this during SSO to refresh user names from the main website. ' .
        'e.g. https://studiesmasters-backend.onrender.com/api/main-website/sync-name',
        '',
        PARAM_URL
    ));
    $settings->add(new admin_setting_configpasswordunmask(
        'local_studiesmasters_sso/mainwebsitetoken',
        'Main website sync token',
        'Shared secret token that the Moodle plugin sends to the main website sync endpoint. ' .
        'Must match MAIN_WEBSITE_SYNC_TOKEN in the StudiesMasters backend .env file. ' .
        'Leave empty to disable main website name sync.',
        ''
    ));

    // Warning when main website sync is not configured.
    $mwUrl = get_config('local_studiesmasters_sso', 'mainwebsiteurl');
    $mwTok = get_config('local_studiesmasters_sso', 'mainwebsitetoken');
    if (empty($mwUrl) || empty($mwTok)) {
        $settings->add(new admin_setting_heading('local_studiesmasters_sso/mainwebsitewarning',
            'Main website name sync',
            '<div class="notifyalert">' .
            '<p><strong>Main website name sync is not configured.</strong></p>' .
            '<p>Accounts that were created by single sign-on still show the placeholder name ' .
            'instead of the real name held on the StudiesMasters main website.</p>' .
            '<p>To fix this, set both fields above and ask a site administrator to set the ' .
            'main website sync endpoint and token in Site administration &gt; Plugins &gt; ' .
            'Local plugins &gt; StudiesMasters SSO.</p>' .
            '</div>'
        ));
    }
}
