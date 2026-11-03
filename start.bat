@echo off
setlocal
cd /d "%~dp0"

if not defined PORT set PORT=4173

where node >nul 2>nul
if not errorlevel 1 (
  echo Starting Perpetual Bloom at http://localhost:%PORT%
  node server.mjs --open
  exit /b %errorlevel%
)

echo Node.js 18+ is required to run the local reader safely.
echo Install Node.js, then run this file again.
pause
exit /b 1
