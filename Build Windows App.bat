@echo off
echo Building Denisse's Reading Tracker for Windows...
cd /d "%~dp0"
npm run dist:win
echo.
echo Done! Opening dist folder...
explorer dist
