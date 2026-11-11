@echo off
rem Football Memories: install, update and open (Windows). Double-click in Explorer.
rem Spec 190 (owner request 2026-11-10). Safe to run again at any time: it never
rem deletes or overwrites your matches, downloads, settings or database.
rem   1. Docker Desktop: installs it if missing (winget, else docker.com), then starts it.
rem   2. Git (for updates), via winget when available.
rem   3. Updates this folder from GitHub (fast-forward only; local changes are kept).
rem   4. Creates .env with a random database password the first time.
rem   5. Builds and starts the app in Docker, then opens it in your browser.
rem   6. Hudl helper: uv, ffmpeg and Google Chrome via winget, then starts the helper.
rem      The saved Hudl password lives in Windows Credential Manager (owner decision
rem      2026-11-11), never in a file.
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Football Memories installer
echo.
echo  Football Memories installer
echo  Folder: %CD%
set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;%ProgramFiles%\Git\cmd;%PATH%"

echo.
echo  1/6 Docker Desktop
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
echo  2/6 Git
where git >nul 2>nul
if errorlevel 1 (
  where winget >nul 2>nul && winget install -e --id Git.Git
)
where git >nul 2>nul && (echo   Git ready.) || (echo   Git not installed: updates from GitHub will be skipped.)

echo.
echo  3/6 Latest version from GitHub
if exist ".git" (
  where git >nul 2>nul
  if not errorlevel 1 (
    git pull --ff-only origin main >nul 2>nul && (echo   Up to date.) || (echo   Kept your current version: local changes or no connection.)
  )
) else (
  echo   Not a git copy: download the latest version from GitHub to update.
)

echo.
echo  4/6 Settings
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
echo  5/6 Building and starting the app (first time: several minutes)
docker compose up -d --build
if errorlevel 1 goto :fail_compose
echo   Waiting for the app...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://127.0.0.1:%FM_PORT%/api/health' | Out-Null; exit 0}catch{Start-Sleep 2}}; exit 1"
if errorlevel 1 goto :fail_health

echo.
echo  6/6 Hudl helper (uv, ffmpeg, Google Chrome)
where winget >nul 2>nul
if errorlevel 1 goto :helper_no_winget
where uv >nul 2>nul || winget install -e --id astral-sh.uv
where ffmpeg >nul 2>nul || winget install -e --id Gyan.FFmpeg
call :find_chrome
if not defined CHROME_FOUND winget install -e --id Google.Chrome
:helper_no_winget
call :refresh_path
set "FM_INBOX=%CD%\data\inbox"
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"FM_HOST_INBOX=" ".env"') do set "FM_INBOX_SETTING=%%b"
rem Only an absolute inbox path (C:\...) replaces the default .\data\inbox.
if defined FM_INBOX_SETTING if "%FM_INBOX_SETTING:~1,1%"==":" set "FM_INBOX=%FM_INBOX_SETTING%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Headers @{Origin='http://127.0.0.1:%FM_PORT%'} 'http://127.0.0.1:8766/account' | Out-Null; exit 0}catch{exit 1}"
if not errorlevel 1 (
  echo   Hudl helper already running.
  goto :helper_done
)
where uv >nul 2>nul
if errorlevel 1 (
  echo   uv is missing, so the Hudl helper cannot start. Install it from astral.sh/uv and run this again.
  goto :helper_done
)
pushd backend
uv sync --frozen
popd
start "Football Memories Hudl helper - keep this window open" /min /d "%CD%\backend" uv run python -m app.connectors.hudl_companion --output "%FM_INBOX%"
echo   Hudl helper started in a minimized window. Keep that window open while you use Hudl.
:helper_done

start "" "http://127.0.0.1:%FM_PORT%"
echo.
echo  Ready at http://127.0.0.1:%FM_PORT%
echo  Double-click this installer any time to start or update the app.
echo.
pause
exit /b 0

:find_chrome
set "CHROME_FOUND="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
set "X86=%ProgramFiles(x86)%"
if exist "%X86%\Google\Chrome\Application\chrome.exe" set "CHROME_FOUND=1"
exit /b 0

:refresh_path
rem Programs installed by winget are on the saved PATH, not yet on this window's PATH.
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%p;%ProgramFiles%\Docker\Docker\resources\bin;%ProgramFiles%\Git\cmd"
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
