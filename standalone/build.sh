#!/bin/sh
# Assemble the standalone (non-WordPress) package from this folder plus the shared core and UI of the plugin.
set -e
here=$(cd "$(dirname "$0")" && pwd)
core="$here/../wordpress-plugin/anbar-shabab"
out="$here/dist/anbar-shabab"
rm -rf "$here/dist" && mkdir -p "$out/includes" "$out/lib"
cp "$here"/index.php "$here"/install.php "$here"/settings.php "$here"/bootstrap.php "$here"/cli.php "$here"/config.sample.php "$here"/README.md "$out/"
cp "$here"/lib/*.php "$here"/lib/.htaccess "$out/lib/"
for f in util db users notify stock tickets catalog xlsx rest; do cp "$core/includes/$f.php" "$out/includes/"; done
printf 'Require all denied\nDeny from all\n' > "$out/includes/.htaccess"
cp -r "$core/assets" "$out/assets"
cd "$here/dist" && rm -f ../anbar-shabab-standalone.zip && zip -qr ../anbar-shabab-standalone.zip anbar-shabab
echo "built $(ls -la "$here/anbar-shabab-standalone.zip" | awk '{print $5}') bytes"
