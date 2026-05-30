#!/bin/bash
# generate-icons.sh - Generate all app icon and splash screen sizes
# Requires: cordova-res (npm install -D cordova-res)
# Usage: bash scripts/generate-icons.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

ICON_SOURCE="${1:-resources/icon.png}"
SPLASH_SOURCE="${2:-resources/splash.png}"

if [ ! -f "$ICON_SOURCE" ]; then
    echo "Error: Icon source not found: $ICON_SOURCE"
    echo "Place a 1024x1024 icon.png in resources/ first."
    exit 1
fi

echo "Generating Android icons and splash screens..."
npx cordova-res android \
    --icon-source "$ICON_SOURCE" \
    ${SPLASH_SOURCE:+--splash-source "$SPLASH_SOURCE"} \
    --skip-config

echo "Generating iOS icons and splash screens..."
npx cordova-res ios \
    --icon-source "$ICON_SOURCE" \
    ${SPLASH_SOURCE:+--splash-source "$SPLASH_SOURCE"} \
    --skip-config

echo "Icon generation complete!"
