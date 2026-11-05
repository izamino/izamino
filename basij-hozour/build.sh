#!/bin/sh
# Builds the standalone index.html (open directly in a browser) from app.html.
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="fa" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'; cat app.html; printf '\n</body>\n</html>\n'; } > index.html
