@echo off
TITLE Sovereign Game Server — ACTIVE

:: Enable UTF-8 Support (Fixes the ? icons)
chcp 65001 > nul

:: Navigate to the script's directory (handles being run from elsewhere)
cd /d "%~dp0"

:START
cls
echo ===========================================
echo      SOVEREIGN - INTERACTIVE SERVER
echo ===========================================
echo.
echo [i] COMMANDS ARE NOW ENABLED! 
echo     You can now type: help, tick, stats, live, or exit.
echo.
echo [!] IMPORTANT: If "Select" appears in the title bar,
echo     the server is PAUSED. Press ENTER to resume.
echo.
echo -------------------------------------------
echo.

:: Execute the server with interactive console input enabled
node server.js

echo.
echo -------------------------------------------
echo ❌ Server process stopped.
echo Press 'R' to Restart or any other key to Exit.
echo -------------------------------------------
set /p userinput=

if /i "%userinput%"=="R" goto START
exit
