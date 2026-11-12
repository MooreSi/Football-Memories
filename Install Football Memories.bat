@echo off
rem Football Memories: install, update and open (Windows). Double-click in Explorer.
rem Spec 190 (owner request 2026-11-10). Safe to run again at any time: it never
rem deletes or overwrites your matches, downloads, settings or database.
rem   1. WSL 2 and Virtual Machine Platform (Docker needs them): turned on after one
rem      Windows permission prompt if missing; asks to restart when Windows needs it.
rem   2. Docker Desktop: installs it if missing (winget, else docker.com), then starts it.
rem   3. Git and uv (needed for updates and the Hudl helper), via winget.
rem   4. Updates this folder from GitHub (fast-forward only; local changes are kept).
rem      A folder unzipped from GitHub is first linked to GitHub so it can update
rem      itself (backend\app\connectors\git_adopt.py; no file is changed). After an
rem      update the installer restarts itself so the new version's steps run.
rem   5. Creates .env with a random database password the first time.
rem   6. Builds and starts the app in Docker, then opens it in your browser.
rem   7. Hudl helper: ffmpeg and Google Chrome via winget, then starts the helper.
rem      The saved Hudl password lives in Windows Credential Manager (owner decision
rem      2026-11-11), never in a file.
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title Football Memories installer
echo.
echo  Football Memories installer
echo  Folder: %CD%
set "PATH=%ProgramFiles%\Docker\Docker\resources\bin;%ProgramFiles%\Git\cmd;%PATH%"
rem Clear the "downloaded from the internet" mark from this folder's scripts so
rem Smart App Control and SmartScreen do not block them on later runs.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath . -File | Unblock-File -ErrorAction SilentlyContinue; if (Test-Path scripts) { Get-ChildItem -LiteralPath scripts -Recurse -File | Unblock-File -ErrorAction SilentlyContinue }" >nul 2>nul

echo.
echo  1/7 WSL 2 for Docker
call :check_wsl
if defined WSL_READY (
  echo   WSL 2 ready.
  goto :wsl_done
)
echo   Docker needs WSL 2 and Virtual Machine Platform. Turning them on now.
echo   Windows will ask "Do you want to allow this app to make changes?": choose Yes.
set "FM_WSL_SCRIPT=%CD%\scripts\windows\setup-wsl.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $p = Start-Process powershell -Verb RunAs -Wait -PassThru -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File ' + [char]34 + $env:FM_WSL_SCRIPT + [char]34); exit $p.ExitCode } catch { exit 1223 }"
set "WSL_RESULT=!errorlevel!"
if "!WSL_RESULT!"=="0" (
  echo   WSL 2 ready.
  goto :wsl_done
)
if "!WSL_RESULT!"=="3010" goto :wsl_restart
if "!WSL_RESULT!"=="1223" goto :fail_wsl_declined
goto :fail_wsl
:wsl_done

echo.
echo  2/7 Docker Desktop
where docker >nul 2>nul
if not errorlevel 1 goto :docker_installed
where winget >nul 2>nul
if not errorlevel 1 (
  echo   Installing Docker Desktop with winget. Accept the prompts that appear.
  winget install -e --id Docker.DockerDesktop
  goto :docker_installed
)
echo   Downloading Docker Desktop from docker.com...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri 'https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe' -OutFile \"$env:TEMP\DockerDesktopInstaller.exe\""
if errorlevel 1 goto :fail_docker_download
start /wait "" "%TEMP%\DockerDesktopInstaller.exe" install
:docker_installed
if not exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
  where docker >nul 2>nul
  if errorlevel 1 goto :fail_docker_install
)
echo   Docker Desktop found.
docker info >nul 2>nul
if not errorlevel 1 goto :docker_ready
echo   Starting Docker Desktop. The first time, accept Docker's terms in its window.
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
for /l %%i in (1,1,120) do (
  docker info >nul 2>nul && goto :docker_ready
  timeout /t 3 /nobreak >nul
)
goto :fail_docker_start
:docker_ready
echo   Docker is running.

echo.
echo  3/7 Git and uv (for updates and the Hudl helper)
where winget >nul 2>nul
if not errorlevel 1 (
  where git >nul 2>nul || winget install -e --id Git.Git
  where uv >nul 2>nul || winget install -e --id astral-sh.uv
)
call :refresh_path
where git >nul 2>nul && (echo   Git ready.) || (echo   Git not installed: install it from git-scm.com so the app can update itself.)
where uv >nul 2>nul && (echo   uv ready.) || (echo   uv not installed: install it from astral.sh/uv for updates and the Hudl helper.)

echo.
echo  4/7 Latest version from GitHub
where git >nul 2>nul
if errorlevel 1 (
  echo   Skipped: Git is not installed.
  goto :update_done
)
set "FM_LINKED="
if exist ".git\HEAD" if not exist ".git\football-memories-linking" set "FM_LINKED=1"
if not defined FM_LINKED (
  where uv >nul 2>nul
  if errorlevel 1 (
    echo   Skipped: uv is needed to link this copy to GitHub.
    goto :update_done
  )
  echo   Linking this copy to GitHub so it can update itself. No file is changed.
  uv run --no-project --quiet python -I "%CD%\backend\app\connectors\git_adopt.py" "%CD%"
  if errorlevel 1 goto :update_done
)
rem Git may replace this file. cmd reads a running batch file from disk line by
rem line, so everything from here to the restart is one block, read before it runs.
(
  set "FM_BEFORE="
  for /f %%h in ('git rev-parse HEAD 2^>nul') do set "FM_BEFORE=%%h"
  git pull --ff-only -q origin main >nul 2>nul
  if errorlevel 1 (
    echo   Kept your current version: local changes or no connection.
  ) else (
    set "FM_AFTER="
    for /f %%h in ('git rev-parse HEAD 2^>nul') do set "FM_AFTER=%%h"
    if not "!FM_BEFORE!"=="!FM_AFTER!" if not defined FM_INSTALLER_RESTARTED (
      echo   Updated. Restarting the installer with the new version...
      set "FM_INSTALLER_RESTARTED=1"
      call "%~f0"
      exit /b
    )
    echo   Up to date.
  )
)
:update_done

echo.
echo  5/7 Settings
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\windows\ensure-env.ps1"
if errorlevel 1 goto :fail_env
set "FM_PORT=8765"
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"FM_PORT=" ".env"') do set "FM_PORT=%%b"
if not exist "data\inbox" mkdir "data\inbox"
if not exist "data\archive" mkdir "data\archive"

echo.
echo  6/7 Building and starting the app (first time: several minutes)
docker compose up -d --build
if errorlevel 1 goto :fail_compose
echo   Waiting for the app...
powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://127.0.0.1:%FM_PORT%/api/health' | Out-Null; exit 0}catch{Start-Sleep 2}}; exit 1"
if errorlevel 1 goto :fail_health

echo.
echo  7/7 Hudl helper (ffmpeg, Google Chrome)
where winget >nul 2>nul
if errorlevel 1 goto :helper_no_winget
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
echo  On a phone or tablet on this Wi-Fi: http://%COMPUTERNAME%:%FM_PORT%
echo  Double-click this installer any time to start or update the app.
echo.
pause
exit /b 0

:check_wsl
rem Ready = wsl.exe works and Virtual Machine Platform is on. Both checks run
rem without administrator rights; if the feature query itself fails, wsl.exe decides.
set "WSL_READY="
powershell -NoProfile -ExecutionPolicy Bypass -Command "& wsl.exe --status *> $null; if ($LASTEXITCODE -ne 0) { exit 1 }; try { $f = Get-CimInstance Win32_OptionalFeature -ErrorAction Stop | Where-Object Name -eq 'VirtualMachinePlatform'; if ($f -and $f.InstallState -ne 1) { exit 1 } } catch { }; exit 0" >nul 2>nul
if not errorlevel 1 set "WSL_READY=1"
exit /b 0

:wsl_restart
rem Run this installer once more automatically after the restart (current user only).
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\RunOnce" /v FootballMemoriesInstall /t REG_SZ /d "\"%~f0\"" /f >nul 2>nul
echo.
echo   WSL 2 is turned on. Windows must restart to finish setting it up.
echo   After the restart this installer opens again by itself and carries on.
choice /c YN /m "  Restart Windows now"
if errorlevel 2 (
  echo   Restart when you are ready; the installer will carry on after it.
  pause
  exit /b 0
)
shutdown /r /t 5 /c "Football Memories: finishing WSL 2 setup"
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

:fail_wsl_declined
echo   Stopped: WSL 2 was not turned on because the Windows permission prompt was declined.
echo   Run this installer again and choose Yes, or run "wsl --install" in an administrator PowerShell.
goto :end_fail
:fail_wsl
echo   Stopped: WSL 2 could not be turned on. See the messages in the other window.
echo   You can also run "wsl --install" in an administrator PowerShell, restart, then run this again.
goto :end_fail
:fail_docker_download
echo   Stopped: could not download Docker Desktop. Check the internet connection.
goto :end_fail
:fail_docker_install
echo   Stopped: Docker Desktop is not installed. Install it from docker.com, then run this again.
goto :end_fail
:fail_docker_start
echo   Stopped: Docker did not start. Open Docker Desktop, wait until it is running, then run this again.
goto :end_fail
:fail_env
echo   Stopped: the settings file .env could not be written in this folder.
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
