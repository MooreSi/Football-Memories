#!/bin/bash
# Football Memories: install, update and open (macOS). Double-click in Finder.
# Spec 190 (owner request 2026-11-10). Safe to run again at any time: it never
# deletes or overwrites your matches, downloads, settings or database.
#
# What it does, in order:
#   1. Docker Desktop: installs it from docker.com if missing, then starts it.
#   2. Apple command-line tools (git, Swift for the Keychain helper).
#   3. Homebrew + ffmpeg, uv (Python runner) and Google Chrome for the Hudl helper.
#   4. Updates this folder from GitHub (fast-forward only; local changes are kept).
#   5. Creates .env with a random database password the first time.
#   6. Builds and starts the app in Docker, starts the Hudl desktop helper.
#   7. Opens the app in your browser.
set -u
cd "$(dirname "$0")" || exit 1
APP_DIR="$(pwd)"
LOG_DIR="$APP_DIR/data"
mkdir -p "$LOG_DIR"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '\n\033[31mStopped:\033[0m %s\n' "$*"; read -r -p "Press Return to close." _; exit 1; }

bold "Football Memories installer"
echo "  Folder: $APP_DIR"

# ---------- 1. Docker Desktop ----------
bold "1/7 Docker Desktop"
export PATH="/Applications/Docker.app/Contents/Resources/bin:/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"
if [ ! -d "/Applications/Docker.app" ] && ! command -v docker >/dev/null 2>&1; then
  case "$(uname -m)" in arm64) ARCH=arm64 ;; *) ARCH=amd64 ;; esac
  DMG="$(mktemp -d)/Docker.dmg"
  echo "  Downloading Docker Desktop ($ARCH) from docker.com…"
  curl -fL --progress-bar -o "$DMG" "https://desktop.docker.com/mac/main/$ARCH/Docker.dmg" || fail "Could not download Docker Desktop."
  MOUNT="$(mktemp -d)"
  hdiutil attach -nobrowse -quiet -mountpoint "$MOUNT" "$DMG" || fail "Could not open the Docker Desktop installer."
  echo "  Copying Docker to Applications (you may be asked for your Mac password)…"
  cp -R "$MOUNT/Docker.app" /Applications/ 2>/dev/null || sudo cp -R "$MOUNT/Docker.app" /Applications/ || fail "Could not copy Docker to Applications."
  hdiutil detach -quiet "$MOUNT"
  rm -f "$DMG"
  ok "Docker Desktop installed"
else
  ok "Docker Desktop found"
fi
if ! docker info >/dev/null 2>&1; then
  echo "  Starting Docker Desktop. The first time, accept Docker's terms in its window."
  open -a Docker
  for _ in $(seq 1 120); do docker info >/dev/null 2>&1 && break; sleep 3; done
  docker info >/dev/null 2>&1 || fail "Docker did not start. Open Docker Desktop, wait for it to say it is running, then double-click this installer again."
fi
ok "Docker is running"

# ---------- 2. Apple command-line tools ----------
bold "2/7 Apple command-line tools (git, Swift)"
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install >/dev/null 2>&1
  echo "  A window has opened to install Apple's command-line tools. Click Install."
  until xcode-select -p >/dev/null 2>&1; do sleep 10; done
fi
ok "Command-line tools ready"

# ---------- 3. Helper dependencies ----------
bold "3/7 Hudl helper dependencies (ffmpeg, uv, Chrome)"
if ! command -v ffmpeg >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "  ffmpeg is installed with Homebrew, the standard Mac package manager."
    read -r -p "  Install Homebrew now? [Y/n] " answer
    if [ "${answer:-Y}" != "n" ] && [ "${answer:-Y}" != "N" ]; then
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || warn "Homebrew did not install."
      [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
      [ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
  if command -v brew >/dev/null 2>&1; then brew install ffmpeg || warn "ffmpeg did not install."; fi
fi
command -v ffmpeg >/dev/null 2>&1 && ok "ffmpeg ready" || warn "ffmpeg missing: Hudl moment downloads will not work until it is installed."
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh || warn "uv did not install."
  export PATH="$HOME/.local/bin:$PATH"
fi
command -v uv >/dev/null 2>&1 && ok "uv ready" || warn "uv missing: the Hudl helper cannot start."
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv sync --frozen >/dev/null 2>&1) && ok "Helper Python packages ready" || warn "Helper packages did not install."
  if [ ! -d "/Applications/Google Chrome.app" ]; then
    echo "  Installing Google Chrome for the Hudl helper (you may be asked for your password)…"
    (cd backend && uv run playwright install chrome) || warn "Install Google Chrome from google.com/chrome for the Hudl helper."
  fi
  [ -d "/Applications/Google Chrome.app" ] && ok "Google Chrome ready"
fi

# ---------- 4. Latest version ----------
bold "4/7 Latest version from GitHub"
if [ -d .git ] && command -v git >/dev/null 2>&1; then
  if git pull --ff-only origin main >/dev/null 2>&1; then ok "Up to date ($(git rev-parse --short HEAD))"
  else warn "Kept your current version (local changes or no connection)."; fi
else
  warn "Not a git copy: download the latest version from GitHub to update."
fi

# ---------- 5. Settings ----------
bold "5/7 Settings"
if [ ! -f .env ]; then
  cp .env.example .env
  PASSWORD="$(openssl rand -hex 24)"
  sed -i '' "s/^FM_DB_PASSWORD=.*/FM_DB_PASSWORD=$PASSWORD/" .env
  ok "Created .env with a random database password"
else
  ok "Using your existing .env"
fi
env_value() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2-; }
PORT="$(env_value FM_PORT)"; PORT="${PORT:-8765}"
INBOX="$(env_value FM_HOST_INBOX)"; INBOX="${INBOX:-./data/inbox}"
ARCHIVE="$(env_value FM_HOST_ARCHIVE)"; ARCHIVE="${ARCHIVE:-./data/archive}"
mkdir -p "$INBOX" "$ARCHIVE"
case "$INBOX" in /*) ;; *) INBOX="$APP_DIR/${INBOX#./}" ;; esac

# ---------- 6. Start ----------
bold "6/7 Building and starting the app (first time: several minutes)"
docker compose up -d --build || fail "Docker could not start the app. See the messages above."
ok "App containers running"
if curl -fs -o /dev/null http://127.0.0.1:8766/account -H "Origin: http://127.0.0.1:$PORT"; then
  ok "Hudl helper already running"
elif command -v uv >/dev/null 2>&1; then
  (cd backend && nohup uv run python -m app.connectors.hudl_companion --output "$INBOX" >>"$LOG_DIR/helper.log" 2>&1 &)
  ok "Hudl helper started (log: data/helper.log)"
fi

# ---------- 7. Open ----------
bold "7/7 Opening Football Memories"
for _ in $(seq 1 90); do curl -fs -o /dev/null "http://127.0.0.1:$PORT/api/health" && break; sleep 2; done
curl -fs -o /dev/null "http://127.0.0.1:$PORT/api/health" || fail "The app did not answer on port $PORT."
open "http://127.0.0.1:$PORT"
ok "Ready at http://127.0.0.1:$PORT"
echo
echo "You can close this window. Double-click this installer any time to start or update the app."
