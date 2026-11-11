# Football Memories: make sure .env exists and has a database password.
# Windows twin of scripts/mac/ensure-env.sh; run by "Install Football Memories.bat"
# from the app folder. Same rules:
# - No .env: copy .env.example (or, if a copy lacks it, start an empty file).
# - FM_DB_PASSWORD missing or blank: write a random one.
# - Any other existing value, including "change-me" in an older .env, is kept:
#   the database volume was initialised with it.
# Exit code 0 = .env is usable, 1 = it could not be written.
$ErrorActionPreference = 'Stop'
try {
    $created = $false
    if (-not (Test-Path -LiteralPath '.env')) {
        if (Test-Path -LiteralPath '.env.example') {
            Copy-Item -LiteralPath '.env.example' -Destination '.env'
        } else {
            Set-Content -LiteralPath '.env' -Value @() -Encoding ASCII
        }
        $created = $true
    }
    $lines = @(Get-Content -LiteralPath '.env')
    $current = ''
    foreach ($line in $lines) {
        if ($line -match '^FM_DB_PASSWORD=(.*)$') { $current = $Matches[1].Trim() }
    }
    if ($created -and $current -eq 'change-me') { $current = '' }
    if ($current) {
        Write-Host '   Using your existing .env.'
        exit 0
    }
    $password = -join ((1..2) | ForEach-Object { [guid]::NewGuid().ToString('N') })
    $password = $password.Substring(0, 48)
    $out = New-Object System.Collections.Generic.List[string]
    $done = $false
    foreach ($line in $lines) {
        if ($line -match '^FM_DB_PASSWORD=') {
            if (-not $done) { $out.Add("FM_DB_PASSWORD=$password"); $done = $true }
        } else {
            $out.Add($line)
        }
    }
    if (-not $done) { $out.Add("FM_DB_PASSWORD=$password") }
    Set-Content -LiteralPath '.env' -Value $out -Encoding ASCII
    if ($created) { Write-Host '   Created .env with a random database password.' }
    else { Write-Host '   Added a random database password to your .env.' }
    exit 0
} catch {
    Write-Host "   Could not write the settings file .env: $($_.Exception.Message)"
    exit 1
}
