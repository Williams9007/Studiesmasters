<?php
// moodle/cli/remove_studiesmasters_virtualclass.php
//
// ONE-SHOT TEARDOWN: removes the StudiesMasters Virtual Classroom from BOTH
// student and teacher dashboards.
//
// WHY A SEPARATE SCRIPT
//   The original bulk installer (add_studiesmasters_dashboard_block.php) only
//   removed the BLOCK, and was deleted as part of the teardown commit --
//   copying it back onto the server just to run it is awkward. This script does
//   the whole job on its own and does NOT depend on any plugin file still being
//   present, which matters because the recommended order is to delete the
//   plugin directories first.
//
// WHAT IT REMOVES
//   1. block_instances rows for blockname 'studiesmasters_virtualclass' for ALL
//      users -- sm_s_* students AND sm_t_* teachers, plus any other account that
//      added it via "Customise dashboard".
//   2. The block's and local plugin's config rows, so the block disappears from
//      the "Add a block" list on Customise dashboard.
//   3. Caches, so the change is visible immediately.
//
// USAGE (from the Moodle root directory):
//   php moodle/cli/remove_studiesmasters_virtualclass.php --dry-run
//   php moodle/cli/remove_studiesmasters_virtualclass.php
//   php moodle/cli/remove_studiesmasters_virtualclass.php --user-id=42
//
// OPTIONS
//   --dry-run    Report exactly what would change; writes nothing.
//   --user-id=N  Limit block-instance removal to one user id (repeatable).
//                Config + cache steps still run.
//   --help       Show this text.
//
// ORDERING: safe to run BEFORE or AFTER deleting
// <moodle>/blocks/studiesmasters_virtualclass and
// <moodle>/local/studiesmasters_virtualclass. Run it, then delete the
// directories, then Site administration -> Notifications, then purge caches.
//
// Standalone by design: only core Moodle APIs that exist in every Moodle 3.9+
// install, so it still works after the plugin files are gone.

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');

list($options, $unrecognised) = cli_get_params(
    ['help' => false, 'dry-run' => false, 'user-id' => false],
    ['h' => 'help', 'n' => 'dry-run', 'u' => 'user-id']
);

if (!empty($options['help'])) {
    cli_writeln('Removes the StudiesMasters Virtual Classroom from student + teacher dashboards.');
    cli_writeln('');
    cli_writeln('  --dry-run     report only, write nothing');
    cli_writeln('  --user-id=N   limit block removal to one user id (repeatable)');
    cli_writeln('');
    cli_writeln('Example: php moodle/cli/remove_studiesmasters_virtualclass.php --dry-run');
    exit(0);
}

$apply = empty($options['dry-run']);

// cli_get_params returns only the LAST value for a non-array option, so also
// pick up every raw --user-id=... occurrence to allow repeating the flag.
$userids = [];
foreach ($unrecognised as $u) {
    if (preg_match('/^--user-id=(\d+)$/', $u, $m)) {
        $userids[] = (int) $m[1];
    }
}
if (!empty($options['user-id'])) {
    $userids[] = (int) $options['user-id'];
}
$userids = array_values(array_unique(array_filter($userids)));

global $DB;

if (!$DB->get_manager()->table_exists('block_instances')) {
    cli_error('block_instances table not found - is this a standard Moodle install?');
}

$blockname = 'studiesmasters_virtualclass';

cli_writeln($apply ? 'Mode: APPLY' : 'Mode: DRY RUN - nothing will be written.');
cli_writeln('');

// ------------------------------------------------------ 1. block instances
// Remove for every user, not just SSO accounts: a block added through
// "Customise dashboard" is per-user and independent of the username scheme.
$where = 'blockname = :blockname';
$params = ['blockname' => $blockname];
if (!empty($userids)) {
    list($insql, $inparams) = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'uid');
    $where .= " AND instanceid $insql";
    $params += $inparams;
}

$instances = $DB->get_records_select('block_instances', $where, $params);
cli_writeln('[1] Block instances on dashboards');
cli_writeln('    found: ' . count($instances));

foreach ($instances as $instance) {
    $who = 'n/a';
    if ($instance->instanceid) {
        $username = $DB->get_field('user', 'username', ['id' => $instance->instanceid]);
        $who = $username ? $username : ('userid ' . $instance->instanceid);
    }
    $line = "    - {$blockname} on '{$who}' (pagetype {$instance->pagetype}, region {$instance->region})";
    if (!$apply) {
        cli_writeln($line . '  [dry-run]');
        continue;
    }
    $DB->delete_records('block_instances', ['id' => $instance->id]);
    cli_writeln($line);
}
cli_writeln('');

// ------------------------------------------------- 2. plugin config rows
// Removes "Upcoming virtual classes" from the "Add a block" picker on
// Customise dashboard, so it cannot be re-added by hand.
cli_writeln('[2] Plugin config (hides the block from Customise dashboard)');
foreach (['block_' . $blockname, 'local_' . $blockname] as $plugin) {
    $values = $DB->get_records('config_plugins', ['plugin' => $plugin]);
    if (empty($values)) {
        cli_writeln("    - {$plugin}: nothing stored");
        continue;
    }
    if (!$apply) {
        cli_writeln('    - ' . $plugin . ': ' . count($values) . " setting(s)  [dry-run]");
        continue;
    }
    $DB->delete_records('config_plugins', ['plugin' => $plugin]);
    cli_writeln('    - ' . $plugin . ': removed ' . count($values) . ' setting(s)');
}
cli_writeln('');

// ---------------------------------------------------------------- 3. caches
if ($apply) {
    purge_all_caches();
    cli_writeln('[3] Caches purged.');
} else {
    cli_writeln('[3] Caches: not purged (dry-run).');
}
cli_writeln('');

cli_writeln($apply
    ? 'Done. If the block still shows, delete the plugin directories and run'
      . ' Site administration -> Notifications, then purge_caches.php.'
    : 'Re-run without --dry-run to apply.');

exit(0);
