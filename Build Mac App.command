#!/bin/bash
# Double-click this to build a .dmg installer for Mac and publish a GitHub release.
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

echo "Installing dependencies..."
npm install

echo "Building Denisse's Reading Tracker for Mac..."
npm run dist:mac

if [ $? -ne 0 ]; then
  echo ""
  echo "Build failed. Check the errors above."
  exit 1
fi

# Read version from package.json
VERSION=$(node -e "console.log(require('./package.json').version)")
TAG="v$VERSION"
DMG=$(ls dist/*.dmg 2>/dev/null | head -1)

echo ""
echo "Publishing GitHub release $TAG..."
gh release create "$TAG" "$DMG" \
  --title "$TAG" \
  --notes "Release $TAG" 2>&1

if [ $? -eq 0 ]; then
  echo "Release $TAG published successfully!"
else
  echo "Note: Release $TAG may already exist — skipping publish."
fi

echo ""
echo "Done! Opening dist folder..."
open dist
