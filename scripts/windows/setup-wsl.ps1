# Football Memories: turn on what Docker Desktop needs on Windows (WSL 2).
# Run elevated by "Install Football Memories.bat" when WSL or Virtual Machine
# Platform is missing; Windows shows one "Yes/No" permission prompt first.
# Exit codes: 0 ready, 3010 restart Windows then run the installer again,
# anything else = could not finish (the message says why).
$ErrorActionPreference = 'Stop'
$restart = $false

function Say($text) { Write-Host "  $text" }

Write-Host ''
Write-Host ' Football Memories: setting up WSL 2 for Docker Desktop'
Write-Host ''

try {
    $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
    $system = Get-CimInstance Win32_ComputerSystem
    if (-not $system.HypervisorPresent -and -not $cpu.VirtualizationFirmwareEnabled) {
        Say 'Warning: virtualization looks switched off in this PC''s firmware (BIOS/UEFI).'
        Say 'Docker needs it. Turn on "Intel VT-x" or "AMD-V / SVM" in the BIOS settings.'
    }
} catch { }

foreach ($feature in 'VirtualMachinePlatform', 'Microsoft-Windows-Subsystem-Linux') {
    try {
        $state = (Get-WindowsOptionalFeature -Online -FeatureName $feature).State
        if ($state -eq 'Enabled') {
            Say "$feature already on."
            continue
        }
        Say "Turning on $feature..."
        $result = Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart
        if ($result.RestartNeeded) { $restart = $true }
        Say "$feature turned on."
    } catch {
        Say "Could not turn on ${feature}: $($_.Exception.Message)"
        Read-Host '  Press Return to close'
        exit 1
    }
}

# Installs or updates the WSL package itself, without a Linux distribution
# (Docker Desktop brings its own).
Say 'Installing or updating WSL...'
# Returns wsl.exe's exit code (-1 when wsl.exe is missing). Its output goes to
# the window, not into the return value.
function Wsl([string[]] $arguments, [switch] $Quiet) {
    try {
        if ($Quiet) { & wsl.exe @arguments *> $null } else { & wsl.exe @arguments | Out-Host }
        return $LASTEXITCODE
    } catch { return -1 }
}
$installCode = Wsl @('--install', '--no-distribution')
if ($installCode -ne 0) { $null = Wsl @('--update') }

if ($restart) {
    Say 'Done. Windows needs to restart to finish.'
    exit 3010
}

$null = Wsl @('--set-default-version', '2') -Quiet
if ((Wsl @('--status') -Quiet) -eq 0) {
    Say 'WSL 2 is ready.'
    exit 0
}
if ($installCode -ne 0) {
    Say 'WSL is installed but Windows needs to restart to finish.'
    exit 3010
}
Say 'WSL did not start. Restart Windows and run the installer again.'
Read-Host '  Press Return to close'
exit 1
