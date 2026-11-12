# Football Memories: make the database accept the password in this folder's .env.
# Sourced by "Install Football Memories.command" once the db container is up and
# before the backend starts; tested by backend/tests/test_db_password_sync.py.
# Bash 3.2 safe. Windows twin: scripts/windows/sync-db-password.ps1.
#
# Why: Compose's project name is fixed, so every copy of the app on this computer
# shares one database volume. A copy unzipped into a new folder gets a new random
# FM_DB_PASSWORD, but Postgres keeps the password it was first set up with, so
# the backend could not log in (owner report 2026-11-12).
#
# Postgres trusts the local socket inside its own container, so this sets the
# role's password to the .env value there. Only the password changes; no data
# is touched. The statement goes in on stdin, never on the command line.

_fm_env_value() {
  grep -E "^$1=" .env 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d '\r'
}

sync_db_password() {
  local user password
  user="$(_fm_env_value FM_DB_USER)"
  user="${user:-memories}"
  password="$(_fm_env_value FM_DB_PASSWORD)"
  [ -n "$password" ] || return 1
  # SQL quoting: double any " in the name and any ' in the password.
  # (sed, not ${var//}: bash 3.2 keeps the backslashes in the replacement.)
  local quoted_user quoted_password
  quoted_user="$(printf '%s' "$user" | sed 's/"/""/g')"
  quoted_password="$(printf '%s' "$password" | sed "s/'/''/g")"
  printf 'ALTER ROLE "%s" WITH PASSWORD '\''%s'\'';\n' "$quoted_user" "$quoted_password" |
    docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U "$user" -d postgres >/dev/null
}
