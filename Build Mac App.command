#!/bin/bash
# Double-click this to build a .dmg installer for Mac.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "Building Denisse's Reading Tracker for Mac..."
npm run dist:mac

echo ""
echo "Done! Opening dist folder..."
open dist
