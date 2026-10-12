<?php
if (getenv('ANBAR_TEST_RESET') !== 'yes') { exit("Refusing: this wipes all warehouse data. Run with ANBAR_TEST_RESET=yes on a test site only.\n"); }
// Test reset: wipe app data and accounts, recreate initial accounts with throwaway test passwords.
global $wpdb;
foreach (get_users(['role' => 'anbar_user']) as $u) { wp_delete_user($u->ID); }
foreach (['items','item_photos','batches','transactions','loans','transfers','exits','exit_lines','tickets','ticket_events','notifications','announcements','audit'] as $t) {
  $wpdb->query("TRUNCATE {$wpdb->prefix}anbar_$t");
}
$pw = [];
foreach (anbar_initial_accounts() as $a) { $pw[$a[0]] = 'test-' . $a[0]; }
anbar_create_initial_accounts($pw, false);
echo "reset ok\n";
