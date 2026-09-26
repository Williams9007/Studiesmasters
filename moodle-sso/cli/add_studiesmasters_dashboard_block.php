<?php
// moodle/cli/add_studiesmasters_dashboard_block.php
//
// Adds the "Upcoming virtual classes" block to the main Moodle dashboard of
// every StudiesMasters SSO account (usernames sm_s_* / sm_t_*).
//
// WHY THIS IS NEEDED
//   A Moodle block is a PLUGIN, not content. Installing block_studiesmasters_-
//   virtualclass makes it *available* in "Customise dashboard", but it never
//   appears on anyone's dashboard by itself — every user has to add it
//   manually. Since all SSO users are created on first login, they all start
//   with a bare default dashboard, which is why /my/ looked empty while
//   /local/studiesmasters_virtualclass/index.php worked fine.
//
//   This inserts the block into each SSO user's dashboard up front, so the
//   virtual-class information shows on /my/ with no manual step.
//
// USAGE (from the Moodle root directory):
//   php moodle/cli/add_studiesmasters_dashboard_block.php --dry-run
//   php moodle/cli/add_studiesmasters_dashboard_block.php
//   php moodle/cli/add_studiesmasters_dashboard_block.php --remove
//   php moodle/cli/add_studiesmasters_dashboard_block.php --user-id=42
//
// OPTIONS
//   --dry-run    Report what would change; writes nothing.
//   --remove     Remove the block instead of adding it.
//   --user-id=N  Limit to a single Moodle user id (repeatable).
//   --help       Show this text.
//
// The block is placed in the "right-side" region of the "user-dashboard"
// page. Users can still remove it via Customise dashboard at any time; this
// never makes it mandatory.

require(__DIR__ . '/../../config.php');
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/blocks/moodle_block.php');

list($options, $unrecognised) = cli_get_params(
    ['help' => false, 'dry-run' => false, 'remove' => false, 'user-id' => false],
    ['h' => 'help', 'n' => 'dry-run', 'r' => 'remove', 'u' => 'user-id']
);

if (!empty($options['help'])) {
    cli_writeln("Adds the StudiesMasters virtual-class block to SSO users' dashboards.");
    cli_writeln("");
    cli_writeln("  --dry-run     report only, write nothing");
    cli_writeln("  --remove      remove the block instead of adding it");
    cli_writeln("  --user-id=N   limit to one user id (repeatable)");
    cli_writeln("");
    cli_writeln("Example: php moodle/cli/add_studiesmasters_dashboard_block.php --dry-run");
    exit(0);
}

$apply = empty($options['dry-run']);
$remove = !empty($options['remove']);
$userids = [];

// cli_get_params returns only the LAST value for a non-array option, so also
// pick up every raw --user-id=... occurrence to allow repeating the flag.
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
    cli_error('block_instances table not found — is this a standard Moodle install?');
}
if (empty(get_config('block_studiesmasters_virtualclass', 'version'))) {
    cli_writeln('WARNING: block_studiesmasters_virtualclass does not appear to be installed.');
    cli_writeln('         Copy moodle-sso/blocks/studiesmasters_virtualclass into');
    cli_writeln('         <moodle>/blocks/ and run Site administration -> Notifications.');
    cli_writeln('');
}

// ---- Build the user selector ------------------------------------------------
if (!empty($userids)) {
    list($insql, $inparams) = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'uid');
    $users = $DB->get_records_select('user', "id $insql", $inparams);
} else {
    // Only StudiesMasters SSO accounts. A username that does not use the
    // stable sm_s_/sm_t_ scheme is not resolvable by the backend, so the block
    // would always render empty for them.
    $users = $DB->get_records_select(
        'user',
        $DB->sql_like('username', ':pattern', false, false),
        ['pattern' => 'sm\\_%']
    );
}

cli_writeln($remove ? 'Mode: REMOVE' : 'Mode: ADD');
cli_writeln($apply ? 'Applying changes.' : 'DRY RUN — nothing will be written.');
cli_writeln('SSO users found: ' . count($users));
cli_writeln('');

$region = 'right-side';
$pagetype = 'user-dashboard';
$added = 0;
$removed = 0;
$skipped = 0;

foreach ($users as $user) {
    $username = (string) $user->username;
    if (strpos($username, 'sm_s_') !== 0 && strpos($username, 'sm_t_') !== 0) {
        $skipped++;
        continue;
    }

    $existing = $DB->get_records('block_instances', [
        'blockname' => 'studiesmasters_virtualclass',
        'instanceid' => $user->id,
        'pagetype' => $pagetype,
    ]);

    if ($remove) {
        if (empty($existing)) {
            $skipped++;
            continue;
        }
        foreach ($existing as $instance) {
            cli_writeln("  - remove from {$username} (id {$user->id}, instance {$instance->id})");
            if ($apply) {
                $DB->delete_records('block_instances', ['id' => $instance->id]);
            }
            $removed++;
        }
        continue;
    }

    if (!empty($existing)) {
        $skipped++;
        continue;
    }

    cli_writeln("  + add to {$username} (id {$user->id})");
    if ($apply) {
        $instance = (object) [
            'blockname' => 'studiesmasters_virtualclass',
            'parentid' => 0,
            'showinsubcontexts' => 0,
            'requiredbytheme' => 0,
            'pagetypepattern' => $pagetype,
            'instanceid' => $user->id,
            'weight' => 10,
            'region' => $region,
            'defaultregion' => 'side-pre',
            'defaultweight' => 10,
            'timecreated' => time(),
            'timemodified' => time(),
        ];
        $instance->id = $DB->insert_record('block_instances', $instance);
    }
    $added++;
}

cli_writeln('');
cli_writeln($remove
    ? "Removed: $removed  (unchanged: $skipped)"
    : "Added: $added  (already present: $skipped)");

if (!$apply && ($added > 0 || $removed > 0)) {
    cli_writeln('');
    cli_writeln('Re-run without --dry-run to apply.');
}

exit(0);
