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

**Windows Smart App Control** blocks a downloaded `.bat` outright ("Smart App
Control blocked a file that may be unsafe"). It checks the browser's "Mark of
the Web"; batch files cannot be code-signed to get past it. Either:

- paste into PowerShell: `irm https://raw.githubusercontent.com/MooreSi/Football-Memories/main/install-windows.ps1 | iex`
  ([install-windows.ps1](install-windows.ps1): fetches the app with git, or
  the ZIP via PowerShell, into `%USERPROFILE%\Football Memories`, then runs the
  installer), or
- right-click the ZIP before unzipping (or the `.bat`) > Properties > **Unblock**.

The installer also unblocks its own folder's scripts on every run.

## What the installer sets up

| Requirement | Why | Mac | Windows |
|---|---|---|---|
| WSL 2 + Virtual Machine Platform | Docker Desktop runs on them | not needed | checked first without admin; if missing, [setup-wsl.ps1](scripts/windows/setup-wsl.ps1) runs elevated (one UAC prompt): `Enable-WindowsOptionalFeature` for both, `wsl --install --no-distribution`, then offers a restart and re-runs the installer once after it (HKCU RunOnce) |
| Docker Desktop | runs the app, database and video tools | downloaded from docker.com and copied to Applications | `winget install Docker.DockerDesktop`, else the docker.com installer |
| git | updates from GitHub | Apple command-line tools (`xcode-select --install`) | `winget install Git.Git` |
| Apple command-line tools (Swift) | the Hudl helper's Keychain bridge | `xcode-select --install` | not needed (Windows uses Credential Manager) |
| Homebrew + ffmpeg | the Hudl helper cuts moments and builds reels | asks before installing Homebrew, then `brew install ffmpeg` | `winget install Gyan.FFmpeg` |
| uv (Python 3.12 runner) | runs the Hudl helper | astral.sh installer | `winget install astral-sh.uv` |
| Google Chrome | the Hudl helper's sign-in browser | `playwright install chrome` | `winget install Google.Chrome` |
| `.env` | database password and folders | [ensure-env.sh](scripts/mac/ensure-env.sh): created from `.env.example` with a random password; a missing or blank `FM_DB_PASSWORD` in an existing `.env` is filled in, any other value is kept | [ensure-env.ps1](scripts/windows/ensure-env.ps1), same rules |

Then it runs `docker compose up -d --build`, starts the Hudl helper on
127.0.0.1:8766, waits for http://127.0.0.1:8765/api/health and opens the app.
On a Mac the helper runs in the background with its log in `data/helper.log`;
on Windows it runs in a minimized window titled "Football Memories Hudl
helper", which must stay open while you use Hudl.

**Where the Hudl password is kept:** the macOS Keychain on a Mac, Windows
Credential Manager on Windows (encrypted to your Windows user). Never in a file.
Deleting a download in Settings moves it to the Trash (Mac) or Recycle Bin
(Windows), so it can be restored.

## Troubleshooting

- **Mac: Terminal shows `[forkpty: Resource temporarily unavailable]`.** The
  Mac has hit its limit on running programs, so Terminal cannot open a window
  and the installer never starts. Nothing in the installer runs at that point.
  Restart the Mac, then double-click the installer again. If it comes back, open
  Terminal and run `ps -Ao comm | sort | uniq -c | sort -rn | head` to see which
  program is piling up, and `sysctl kern.maxprocperuid` for the limit.
- **Windows: Docker Desktop says "WSL not installed".** Run the installer
  again: it turns WSL 2 on first. If the permission prompt was declined, run
  `wsl --install` in an administrator PowerShell and restart.
- **Windows: WSL setup warns that virtualization is off.** Turn on Intel VT-x or
  AMD-V/SVM in the PC's BIOS/UEFI settings; Windows cannot do that itself.

- **"required variable FM_DB_PASSWORD is missing a value".** Fixed
  2026-11-11: `.env.example` was missing from GitHub copies, so no `.env` was
  made. Update the folder (or download it again) and run the installer: it
  now writes the password even when the template is missing.

- **"The app did not answer on port 8765" after unzipping a new copy.** Fixed
  2026-11-12. Every copy on a computer shares one database, which keeps the
  password it was first set up with; a new folder got a new password in its
  `.env`, so the app could not log in to its own database and kept restarting.
  The installer now sets the database password from `.env` before starting the
  app (only the password; no data changes). Run the latest installer again.
  If it still stops, it now prints the app's last messages: send those.

## Updating

- **In the app (Mac and Windows):** Settings → Update shows the running and latest
  versions. A gold "Update available" button flashes in the header when GitHub
  has a newer version. **Update now** fast-forwards this folder to GitHub
  `main`, rebuilds Docker and restarts the helper. A copy with local code
  changes is never overwritten; you are told instead.
- **Without the helper running:** double-click the installer again.

**A folder downloaded as a ZIP** (no `.git`) updates too. The installer, or
the first check in Settings → Update, links it to GitHub: it finds the GitHub
version the ZIP was made from and records it in a new `.git` folder. No file in
the folder is changed, so your `.env`, `data/` and downloads are untouched. If
the app's files were edited by hand, no version matches and the copy is left
exactly as it was, with a message. This needs git (Mac: Apple's command-line
tools, installed by step 2; Windows: Git and uv, installed by step 3).

After pulling a new version the installer restarts itself, so the new
version's own steps run (on Windows this also stops cmd reading a batch file
that git has just replaced).

**Copies installed from a ZIP before 2026-11-12** have the older installer,
which cannot link itself. Link it once from Terminal on that Mac (it changes no
file), then double-click the installer twice: the first run updates the folder,
the second runs the new installer. From then on it updates itself.

```bash
cd "path/to/the/app/folder" && curl -fsSL https://raw.githubusercontent.com/MooreSi/Football-Memories/main/backend/app/connectors/git_adopt.py | /usr/bin/python3 -I - .
```

On Windows, the same in PowerShell (it needs Git and uv, which the older
installer already set up):

```powershell
cd "path\to\the\app\folder"; irm https://raw.githubusercontent.com/MooreSi/Football-Memories/main/backend/app/connectors/git_adopt.py | uv run --no-project --quiet python -I - .
```

## Manual install (developers)

See [DEVELOPMENT.md](DEVELOPMENT.md). Python dependencies are pinned in
`backend/uv.lock` / `backend/requirements.lock`, frontend ones in
`frontend/package-lock.json`; both are installed inside Docker by the build.
