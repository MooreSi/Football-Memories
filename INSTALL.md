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
| Apple command-line tools (Swift) | the Hudl helper's Keychain bridge | `xcode-select --install` | not needed (Windows uses Credential Manager) |
| Homebrew + ffmpeg | the Hudl helper cuts moments and builds reels | asks before installing Homebrew, then `brew install ffmpeg` | `winget install Gyan.FFmpeg` |
| uv (Python 3.12 runner) | runs the Hudl helper | astral.sh installer | `winget install astral-sh.uv` |
| Google Chrome | the Hudl helper's sign-in browser | `playwright install chrome` | `winget install Google.Chrome` |
| `.env` | database password and folders | created from `.env.example` with a random password | same |

Then it runs `docker compose up -d --build`, starts the Hudl helper on
127.0.0.1:8766, waits for http://127.0.0.1:8765/api/health and opens the app.
On a Mac the helper runs in the background with its log in `data/helper.log`;
on Windows it runs in a minimized window titled "Football Memories Hudl
helper", which must stay open while you use Hudl.

**Where the Hudl password is kept:** the macOS Keychain on a Mac, Windows
Credential Manager on Windows (encrypted to your Windows user). Never in a file.
Deleting a download in Settings moves it to the Trash (Mac) or Recycle Bin
(Windows), so it can be restored.

## Updating

- **In the app (Mac and Windows):** Settings → Update shows the running and latest
  versions. A gold "Update available" button flashes in the header when GitHub
  has a newer version. **Update now** fast-forwards this folder to GitHub
  `main`, rebuilds Docker and restarts the helper. A copy with local code
  changes is never overwritten; you are told instead.
- **Without the helper running:** double-click the installer again.

The repository is private, so update checks use your own git sign-in on this
computer. A folder downloaded as a ZIP (no `.git`) cannot update itself:
download the new version instead.

## Manual install (developers)

See [DEVELOPMENT.md](DEVELOPMENT.md). Python dependencies are pinned in
`backend/uv.lock` / `backend/requirements.lock`, frontend ones in
`frontend/package-lock.json`; both are installed inside Docker by the build.
