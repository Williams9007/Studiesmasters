<?php
// local/studiesmasters_sso/version.php
// StudiesMasters <-> Moodle Single Sign-On local plugin.
// Install this folder as a local plugin in Moodle, then run the Moodle upgrade so the
// "Shared SSO secret" setting appears under Site administration -> Plugins -> Local plugins.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_studiesmasters_sso';
$plugin->version   = 2024082400; // YYYYMMDDXX
$plugin->requires  = 2020061500; // Moodle 3.9+
$plugin->release   = '1.0.0';
$plugin->maturity  = MATURITY_STABLE;
