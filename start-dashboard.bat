@echo off
setlocal
title KOL Dashboard v2
cd /d "%~dp0"

echo ==================================================
echo    KOL Dashboard v2
echo ==================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install it first:
  echo         https://nodejs.org
  echo.
  pause
  exit /b 1
)

REM ---- already running? just open the browser ----
powershell -NoProfile -Command "try{$null=Invoke-WebRequest 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2;exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 (
  echo Already running - opening browser...
  start "" "http://localhost:5173"
  ping -n 4 127.0.0.1 >nul
  exit /b 0
)

REM ---- install dependencies on first run ----
if not exist "server\node_modules" (
  echo [1/4] Installing server dependencies, please wait...
  start "" /D "%~dp0server" /WAIT cmd /c "npm install"
)
if not exist "client\node_modules" (
  echo [1/4] Installing client dependencies, please wait...
  start "" /D "%~dp0client" /WAIT cmd /c "npm install"
)

echo [2/4] Starting BACKEND  ... port 4000
start "KOL Dashboard - BACKEND - do not close" /D "%~dp0server" cmd /k "npm run dev"

echo [3/4] Starting FRONTEND ... port 5173
start "KOL Dashboard - FRONTEND - do not close" /D "%~dp0client" cmd /k "npm run dev"

echo [4/4] Waiting for the dashboard to be ready...
powershell -NoProfile -Command "for($i=0;$i -lt 90;$i++){try{$r=Invoke-WebRequest 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0}}catch{}; Start-Sleep -Milliseconds 500}; exit 1"
if errorlevel 1 (
  echo.
  echo [WARNING] Timed out. Check the two server windows for errors.
  echo.
  pause
  exit /b 1
)

echo.
echo   READY  ^>^>  http://localhost:5173
echo   Login  ^>^>  admin / admin1234
echo.
start "" "http://localhost:5173"
echo   To stop: close the BACKEND and FRONTEND windows.
ping -n 9 127.0.0.1 >nul
exit /b 0
