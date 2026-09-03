@echo off
rem ============================================================
rem  Kootzy local dev server — double-click to run.
rem
rem  Uses the full Node path so it works even in terminals that
rem  were opened before Node was installed (PATH is only read
rem  when a terminal starts).
rem ============================================================

set "NODE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE%" (
    echo Node.js not found at "%NODE%".
    echo Install it with:  winget install OpenJS.NodeJS.LTS
    pause
    exit /b 1
)

cd /d "%~dp0"

set "PORT=8780"
set "ADMIN_PIN=9876"

rem Supabase (optional locally): without these, customer cart/checkout and the
rem operator dashboard return 503 but every page still serves. To test the full
rem flow locally, paste the values from Vercel's environment settings here or
rem set them in this window before running.
rem set "SUPABASE_URL=https://xsydhbvuerdvngzuflef.supabase.co"
rem set "SUPABASE_ANON_KEY=..."
rem set "SUPABASE_SERVICE_ROLE_KEY=..."

echo.
echo   Kootzy dev server starting on http://localhost:%PORT%
echo   Admin PIN: %ADMIN_PIN%
echo   Stop with Ctrl+C
echo.

"%NODE%" server.js
pause
