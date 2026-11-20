# Football Memories: start the desktop helper when this user signs in to Windows.
# Owner request 2026-11-20. Windows twin of scripts/mac/helper-login-item.sh; run by
# "Install Football Memories.bat" from the app folder once backend\.venv exists.
#
# A shortcut in this user's Startup folder (shows in Task Manager > Startup apps; no
# admin, no service, no scheduled task). It opens the helper in the same minimised
# "keep this window open" window the installer uses. The in-app updater already
# starts a fresh helper and closes the old one, so nothing here restarts it.
# Rewritten every run, so a moved copy points at its new folder.
# Exit code 0 = shortcut saved, 1 = not saved (the installer says so and carries on).
param(
    [Parameter(Mandatory = $true)][string]$AppDir,
    [Parameter(Mandatory = $true)][string]$Inbox,
    [string]$StartupDir = [Environment]::GetFolderPath('Startup')
)
$ErrorActionPreference = 'Stop'
try {
    $backend = Join-Path $AppDir 'backend'
    $python = Join-Path $AppDir 'backend\.venv\Scripts\python.exe'
    if (-not (Test-Path -LiteralPath $python)) { exit 1 }
    $title = 'Football Memories Hudl helper - keep this window open'
    # cmd /c "..." drops only the outer quotes, so the quoted paths inside survive.
    $command = "title $title & `"$python`" -m app.connectors.hudl_companion --output `"$Inbox`""
    New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut((Join-Path $StartupDir 'Football Memories Hudl helper.lnk'))
    $shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\cmd.exe'
    $shortcut.Arguments = "/c `"$command`""
    $shortcut.WorkingDirectory = $backend
    $shortcut.WindowStyle = 7  # minimised
    $shortcut.Description = 'Starts the Football Memories helper (Hudl and Veo) at sign-in.'
    $shortcut.Save()
    exit 0
} catch {
    exit 1
}
