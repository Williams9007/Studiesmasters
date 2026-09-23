<?php
// local/studiesmasters_virtualclass/version.php
// StudiesMasters Virtual Classroom launcher — Moodle local plugin.
// Students/teachers launch Google Meet classes from INSIDE Moodle, while the
// StudiesMasters backend (MongoDB) remains the single source of truth for
// scheduling, Meet generation, attendance, and audit.
//
// Install this folder in:  your-moodle-dir/local/studiesmasters_virtualclass
// then run Site administration -> Notifications to upgrade.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_studiesmasters_virtualclass';
$plugin->version   = 2026092302; // YYYYMMDDXX — outranks server-side v2026092301
$plugin->requires  = 2020061500; // Moodle 3.9+
$plugin->release   = '1.0.0';
$plugin->maturity  = MATURITY_STABLE;