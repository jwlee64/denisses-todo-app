#!/bin/bash
# Double-click this to build a .dmg installer for Mac.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "Installing dependencies..."
npm install

echo "Building Denisse's Reading Tracker for Mac..."
npm run dist:mac

if [ $? -eq 0 ]; then
  echo ""
  echo "Done! Opening dist folder..."
  open dist
else
  echo ""
  echo "Build failed. Check the errors above."
fi
