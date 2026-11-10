# Installing Football Memories

The easy way: open this folder and double-click the installer for your computer.
Run it again any time to start the app or update it. It never deletes or
overwrites your matches, downloads, settings or database.

| Computer | Installer |
|---|---|
| Mac | `Install Football Memories.command` |
| Windows 10/11 | `Install Football Memories.bat` |

If macOS says the file is from an unidentified developer, right-click it,
choose **Open**, then **Open** again. Windows SmartScreen: **More info → Run anyway**.

## What the installer sets up

| Requirement | Why | Mac | Windows |
|---|---|---|---|
| Docker Desktop | runs the app, database and video tools | downloaded from docker.com and copied to Applications | `winget install Docker.DockerDesktop`, else the docker.com installer (may ask for WSL 2 and a restart) |
| git | updates from GitHub | Apple command-line tools (`xcode-select --install`) | `winget install Git.Git` |
| Apple command-line tools (Swift) | the Hudl helper's Keychain bridge | `xcode-select --install` | not needed |
| Homebrew + ffmpeg | the Hudl helper cuts moments and builds reels | asks before installing Homebrew, then `brew install ffmpeg` | not needed |
| uv (Python 3.12 runner) | runs the Hudl helper | astral.sh installer | not needed |
| Google Chrome | the Hudl helper's sign-in browser | `playwright install chrome` | not needed |
| `.env` | database password and folders | created from `.env.example` with a random password | same |

Then it runs `docker compose up -d --build`, starts the Hudl helper (Mac) on
127.0.0.1:8766 with its log in `data/helper.log`, waits for
http://127.0.0.1:8765/api/health and opens the app.

**The Hudl connection works on a Mac only** (it keeps the Hudl password in the
macOS Keychain). On Windows you can still import match videos from the inbox
folder and use every other screen.

## Updating

- **In the app (Mac):** Settings → Update shows the running and latest
  versions. A gold "Update available" button flashes in the header when GitHub
  has a newer version. **Update now** fast-forwards this folder to GitHub
  `main`, rebuilds Docker and restarts the helper. A copy with local code
  changes is never overwritten; you are told instead.
- **Windows, or without the helper:** double-click the installer again.

The repository is private, so update checks use your own git sign-in on this
computer. A folder downloaded as a ZIP (no `.git`) cannot update itself:
download the new version instead.

## Manual install (developers)

See [DEVELOPMENT.md](DEVELOPMENT.md). Python dependencies are pinned in
`backend/uv.lock` / `backend/requirements.lock`, frontend ones in
`frontend/package-lock.json`; both are installed inside Docker by the build.
