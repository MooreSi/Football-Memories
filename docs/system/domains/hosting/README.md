# Hosted runtime security

The public entry point is maintained in `~/Football Memories Gateway`. Its dated security
report records the HTTP/TLS, authentication, network and image review. This app supplies the
per-family backend, web and capture images; the owner's local stack is separate.

Package audits and image audits answer different questions. An npm/pip audit can be clean
while Nginx, system libraries or embedded build tools have advisories. Scan actual running
image IDs, then rescan rebuilt images; rebuilding a tag does not update existing containers.
No image scan proves exploitability or absence of flaws. Keep unfixed findings visible.

Runtime Python/Nginx bases are pinned by digest. Apt installs available security updates at
build time, including packages already present in the base. Pip is removed only after all
dependencies (and, for capture, Chromium) are installed. Running containers do not need it.
Never rebuild/redeploy the owner's local stack as a side effect of hosted maintenance.
Never remove user data volumes, read credentials, or contact Hudl/Veo to smoke-test an image.

## Shared-login diagnostics (2026-11-23)

- Hosted `secret_store()` selects `SealedFileStore`, not the desktop OS Keychain.
  `hudl_companion.create_companion()` stores Hudl/Veo sealed files under `/data/.secrets`
  and their metadata caches alongside them on the persistent capture volume. Browser
  cookies for source sites remain ephemeral; saved passwords and cached matches persist.
- Gateway `forward.web_name(user.id)` selects the same web/capture instance for every
  fully signed-in session belonging to that user. Gateway `UserPermission` confirmations
  also belong to user ID, not to a particular device. Sharing one Football Memories login
  therefore already shares its saved source connections and library.
- To diagnose an empty second-device library, check the URL and displayed account first,
  then `/_portal/api/connections`, `/helper/veo/account` and `/helper/veo/library` in that
  browser. Read cached status only; do not trigger source login/refresh just to diagnose.
  Never print credentials, session headers, signed links or complete library responses.
- `fm.connections.hidden` and age/season filters live in browser localStorage. Source
  visibility can differ between devices without the saved account differing.
- Current UI has misleading states: `LibraryPage` shows `HostedConnectionsNote` for
  both pending/failed permission reads and genuinely missing confirmations. `ConnectionsPage`
  similarly renders the permission form when permission data is absent. Hudl/Veo Settings
  always render empty credential inputs; `configured: true` means those are replacement
  fields, not evidence of missing credentials. Both account components describe every
  non-Windows store as Mac Keychain, including the hosted sealed store. These are observed
  code issues; they do not establish the cause of an unobserved device's empty library.

## Library updates (spec 340, owner decision 013, 2026-11-20)

- A hosted library never reaches GitHub. The Gateway repo's host updater (launchd, hourly)
  reads `MooreSi/Football-Memories` main, builds each new commit once in its own clone as
  `fm-app-*:hosted-<full commit>`, then moves `:hosted` and the shared crest service to it
  (owner request 2026-11-20), and writes a status file the
  provisioner reads read-only. It takes no commands.
- The page asks the gateway on its own origin: `GET /_portal/api/update`, `POST .../apply`,
  `POST .../auto {enabled}` (CSRF token from `/_portal/api/me`). `HostedUpdateSettings` and
  `HostedUpdateBadge`; the title-bar button shows only when an update is ready and the tick
  box is off.
- A library's version is a provisioner file beside its database password; moving recreates
  only its backend, web and capture containers. The database and volumes stay.
- **Gotcha:** a library still on a build from before this feature has no Update tab, so it
  can only be moved by the admin (done once for all three on 2026-11-20).
- **Check for updates** (owner request 2026-11-20): one button in Update; it becomes "Update
  now" once a newer version is ready. In a hosted library it asks the gateway, whose
  provisioner leaves a note (time only) in the Gateway repo's `updates/requests/check`; the
  updater's launchd job watches that file (WatchPaths) and runs its fixed check. At most one
  note per five minutes. The page waits until the status file's `checked_at` is at or after
  the request time. Checked live 2026-11-20: note to updater run to new `checked_at` in seconds.
