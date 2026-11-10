@echo off
rem Football Memories: install, update and open (Windows). Double-click in Explorer.
rem Spec 190 (owner request 2026-11-10). Safe to run again at any time: it never
rem deletes or overwrites your matches, downloads, settings or database.
rem   1. Docker Desktop: installs it if missing (winget, else docker.com), then starts it.
rem   2. Git (for updates), via winget when available.
rem   3. Updates this folder from GitHub (fast-forward only; local changes are kept).
rem   4. Creates .env with a random database password the first time.
rem   5. Builds and starts the app in Docker, then opens it in your browser.
rem The Hudl desktop helper uses the macOS Keychain and runs on a Mac only.
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Football Memories installer
echo.
echo  Football Memories installer
echo  Folder: %CD%
set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;%ProgramFiles%\Git\cmd;%PATH%"

echo.
echo  1/5 Docker Desktop
where docker >nul 2>nul
if errorlevel 1 (
  where winget >nul 2>nul
  if not errorlevel 1 (
    echo   Installing Docker Desktop with winget. Accept the prompts that appear.
    winget install -e --id Docker.DockerDesktop
  ) else (
    echo   Downloading Docker Desktop from docker.com...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe' -OutFile \"$env:TEMP\DockerDesktopInstaller.exe\""
    if errorlevel 1 goto :fail_docker_download
    start /wait "" "%TEMP%\DockerDesktopInstaller.exe" install
  )
)
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  where docker >nul 2>nul
  if errorlevel 1 goto :fail_docker_install
)
echo   Docker Desktop found.
docker info >nul 2>nul
if errorlevel 1 (
  echo   Starting Docker Desktop. The first time, accept Docker's terms in its window.
  echo   If Windows asks to install WSL or restart, do that, then run this installer again.
  if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  for /l %%i in (1,1,120) do (
    docker info >nul 2>nul && goto :docker_ready
    timeout /t 3 /nobreak >nul
  )
  goto :fail_docker_start
)
:docker_ready
echo   Docker is running.

echo.
echo  2/5 Git
where git >nul 2>nul
if errorlevel 1 (
  where winget >nul 2>nul && winget install -e --id Git.Git
)
where git >nul 2>nul && (echo   Git ready.) || (echo   Git not installed: updates from GitHub will be skipped.)

echo.
echo  3/5 Latest version from GitHub
if exist ".git" (
  where git >nul 2>nul
  if not errorlevel 1 (
    git pull --ff-only origin main >nul 2>nul && (echo   Up to date.) || (echo   Kept your current version: local changes or no connection.)
  )
) else (
  echo   Not a git copy: download the latest version from GitHub to update.
)

echo.
echo  4/5 Settings
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N').Substring(0,16); (Get-Content '.env') -replace '^FM_DB_PASSWORD=.*', ('FM_DB_PASSWORD='+$p) | Set-Content -Encoding ASCII '.env'"
  echo   Created .env with a random database password.
) else (
  echo   Using your existing .env.
)
set "FM_PORT=8765"
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"FM_PORT=" ".env"') do set "FM_PORT=%%b"
if not exist "data\inbox" mkdir "data\inbox"
if not exist "data\archive" mkdir "data\archive"

echo.
echo  5/5 Building and starting the app (first time: several minutes)
docker compose up -d --build
if errorlevel 1 goto :fail_compose
echo   Waiting for the app...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://127.0.0.1:%FM_PORT%/api/health' | Out-Null; exit 0}catch{Start-Sleep 2}}; exit 1"
if errorlevel 1 goto :fail_health
start "" "http://127.0.0.1:%FM_PORT%"
echo.
echo  Ready at http://127.0.0.1:%FM_PORT%
echo  Double-click this installer any time to start or update the app.
echo  Note: the Hudl connection helper runs on a Mac only.
echo.
pause
exit /b 0

:fail_docker_download
echo   Stopped: could not download Docker Desktop. Check the internet connection.
goto :end_fail
:fail_docker_install
echo   Stopped: Docker Desktop is not installed. Install it from docker.com, then run this again.
goto :end_fail
:fail_docker_start
echo   Stopped: Docker did not start. Open Docker Desktop, wait until it is running, then run this again.
goto :end_fail
:fail_compose
echo   Stopped: Docker could not start the app. See the messages above.
goto :end_fail
:fail_health
echo   Stopped: the app did not answer on port %FM_PORT%.
:end_fail
echo.
pause
exit /b 1
