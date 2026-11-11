# Football Memories: one-line Windows install that Smart App Control allows.
#
# Windows Smart App Control blocks .bat files that were downloaded in a browser
# (they carry the "Mark of the Web"). Files fetched by PowerShell or git do not,
# so this script fetches the app that way and then runs the normal installer.
# Paste this into PowerShell (Start menu > type "PowerShell" > Enter):
#
#   irm https://raw.githubusercontent.com/MooreSi/Football-Memories/main/install-windows.ps1 | iex
#
# Safe to run again: an existing copy is kept and only started/updated by the
# installer, which never deletes your matches, downloads, settings or database.
& {
$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/MooreSi/Football-Memories'
$target = Join-Path $env:USERPROFILE 'Football Memories'
$installer = Join-Path $target 'Install Football Memories.bat'

function Say($text) { Write-Host "  $text" }

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
        [Environment]::GetEnvironmentVariable('Path', 'User')
}

Write-Host ''
Write-Host ' Football Memories: getting the app'
Say "Folder: $target"

if (Test-Path -LiteralPath $installer) {
    Say 'Found an existing copy; the installer will update it.'
} elseif (Test-Path -LiteralPath $target) {
    Say "Stopped: $target already exists but is not Football Memories."
    Say 'Rename or move that folder, then run this again.'
    return
} else {
    if (-not (Get-Command git -ErrorAction SilentlyContinue) -and (Get-Command winget -ErrorAction SilentlyContinue)) {
        Say 'Installing Git (used to fetch and update the app)...'
        winget install -e --id Git.Git
        Refresh-Path
    }
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Say 'Downloading with git...'
        git clone "$repo.git" "$target"
        if ($LASTEXITCODE -ne 0) { Say 'Stopped: git could not download the app.'; return }
    } else {
        Say 'Downloading the ZIP from GitHub (this copy cannot update itself)...'
        $zip = Join-Path $env:TEMP 'football-memories.zip'
        $unpacked = Join-Path $env:TEMP 'football-memories-unpacked'
        Invoke-WebRequest -UseBasicParsing -Uri "$repo/archive/refs/heads/main.zip" -OutFile $zip
        if (Test-Path -LiteralPath $unpacked) { Remove-Item -LiteralPath $unpacked -Recurse -Force }
        Expand-Archive -LiteralPath $zip -DestinationPath $unpacked
        Move-Item -LiteralPath (Join-Path $unpacked 'Football-Memories-main') -Destination $target
        Remove-Item -LiteralPath $zip, $unpacked -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Belt and braces: clear any internet mark on the scripts before running them.
Get-ChildItem -LiteralPath $target -File | Unblock-File -ErrorAction SilentlyContinue
$scripts = Join-Path $target 'scripts'
if (Test-Path -LiteralPath $scripts) {
    Get-ChildItem -LiteralPath $scripts -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
}

Say 'Starting the installer...'
& $installer
}
