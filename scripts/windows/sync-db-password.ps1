# Football Memories: make the database accept the password in this folder's .env.
# Windows twin of scripts/mac/sync-db-password.sh; run by "Install Football Memories.bat"
# from the app folder once the db container is up and before the backend starts.
#
# Every copy of the app on this computer shares one database volume (Compose's
# project name is fixed). A copy unzipped into a new folder gets a new random
# FM_DB_PASSWORD, but Postgres keeps the password it was first set up with, so
# the backend could not log in (owner report 2026-11-12). Postgres trusts the
# local socket inside its own container, so this sets the role's password to the
# .env value there. Only the password changes; no data is touched. The statement
# goes in on stdin, never on the command line.
# Exit code 0 = done, 1 = no password in .env or psql failed.
$ErrorActionPreference = 'Stop'
function Get-EnvValue($name) {
    $line = Get-Content -LiteralPath '.env' -ErrorAction SilentlyContinue |
        Where-Object { $_ -match "^$name=" } | Select-Object -Last 1
    if ($line) { return $line.Substring($name.Length + 1).Trim() }
    return ''
}
try {
    $user = Get-EnvValue 'FM_DB_USER'
    if (-not $user) { $user = 'memories' }
    $password = Get-EnvValue 'FM_DB_PASSWORD'
    if (-not $password) { exit 1 }
    $sql = 'ALTER ROLE "' + $user.Replace('"', '""') + '" WITH PASSWORD ''' +
        $password.Replace("'", "''") + ''';'
    $sql | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U $user -d postgres | Out-Null
    if ($LASTEXITCODE -ne 0) { exit 1 }
    exit 0
} catch {
    exit 1
}
