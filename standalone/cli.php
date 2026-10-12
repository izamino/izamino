<?php
/** Command line helper: php cli.php <file.php> runs a PHP file with the app loaded (used by tests and maintenance). */
if (PHP_SAPI !== 'cli') {
    exit;
}
require __DIR__ . '/bootstrap.php';
if (empty($argv[1]) || !is_file($argv[1])) {
    fwrite(STDERR, "Usage: php cli.php <file.php>\n");
    exit(1);
}
require $argv[1];
