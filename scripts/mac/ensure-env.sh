# Football Memories: make sure .env exists and has a database password.
# Sourced by "Install Football Memories.command"; tested by
# backend/tests/test_installers.py. Run from the app folder. Bash 3.2 safe.
#
# - No .env: copy .env.example (or, if a copy lacks it, start an empty file).
# - FM_DB_PASSWORD missing or blank: write a random one. The database cannot
#   have started without one, so this never locks the app out of its data.
# - Any other existing value, including the template's "change-me", is kept:
#   the database volume was initialised with it.

_fm_random_password() {
  local value
  value="$(openssl rand -hex 24 2>/dev/null)"
  if [ "${#value}" -ne 48 ]; then
    value="$(LC_ALL=C tr -dc 'a-f0-9' </dev/urandom | head -c 48)"
  fi
  printf '%s' "$value"
}

ensure_env() {
  ENV_CREATED=0
  ENV_REPAIRED=0
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      cp .env.example .env || return 1
    else
      : >.env || return 1
    fi
    ENV_CREATED=1
  fi
  local current
  current="$(grep -E '^FM_DB_PASSWORD=' .env | tail -n 1 | cut -d= -f2- | tr -d '[:space:]')"
  if [ "$ENV_CREATED" = 1 ] && [ "$current" = "change-me" ]; then
    current=""
  fi
  if [ -n "$current" ]; then
    return 0
  fi
  local password tmp
  password="$(_fm_random_password)"
  [ "${#password}" -eq 48 ] || return 1
  tmp="$(mktemp .env.XXXXXX)" || return 1
  awk -v line="FM_DB_PASSWORD=$password" '
    /^FM_DB_PASSWORD=/ { if (!done) { print line; done = 1 }; next }
    { print }
    END { if (!done) print line }
  ' .env >"$tmp" && mv "$tmp" .env || { rm -f "$tmp"; return 1; }
  chmod 600 .env 2>/dev/null
  [ "$ENV_CREATED" = 1 ] || ENV_REPAIRED=1
  return 0
}
