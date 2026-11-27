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
- Audit sessions/sign-ins against screenshot time before attributing a failure to a browser.
  A separate account's valid session with no service permissions produces the same panel.
  Session/audit IPs are keyed hashes of login-time addresses, not recoverable public IPs or
  browser identities. Existing gateway access logs show proxy peers; edge has no HTTP
  access logger configured. Per-library Nginx logs contain user agents but are lost on
  container replacement. Do not infer an absent source request is a failed source login.
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

## Historical admin-only Library preview (spec 520, superseded by spec 530)
Spec520 used `FM_GROUPED_TOURNAMENTS=1` as an opt-in frontend Docker build argument.
Spec530 releases this presentation by default (1); explicit 0 retains rollback behavior.
Preview deployment uses only full-commit version tags on a feature branch, registers the
version in updater `built` under its normal lock, and moves the admin library explicitly.
Never move updater `latest` or shared :hosted tags for a preview. Pause admin automatic
updates during review (record the previous setting), otherwise the normal update round
would replace this version with latest. Other libraries retain their preferences/images.

## General tournament release (spec 530)
Owner authorizes release to every hosted library, the local app and default GitHub builds.
Use normal main/updater/default-image pipeline, then move all provisioned libraries after
idle source/render checks. Preserve databases/footage and other users' update settings.
Restore admin auto-update to its pre-preview true once public latest equals the release.

## Lab access and preview-safe updates (spec 720)

Lab access belongs to the gateway account, independently of a hosted app image.
`lab_access` rows store separate Player Lab / Video Lab switches. Missing rows retain
admin-on / ordinary-user-off defaults. Only a fully verified admin may change them
in Settings > Advanced; grants never change a user's role or library ownership.
`/me` supplies effective switches only after full sign-in. Video Lab APIs enforce the
switch on every request and continue to bind jobs/labels/artifacts to the caller.
Legacy operator samples remain admin-only; new imported samples carry owner IDs.

The public edge deliberately blocks `/_admin` outside the home network. Granted
users therefore call the matching `/_portal/api/video-analytics` routes, with the
same entitlement/owner/CSRF checks. Admin keeps the existing route. Never open the
admin console at the edge as a workaround for granting lab access.

The updater records full Git ancestry for its latest release, resolving shallow
history first; the provisioner passes the validated hashes to the gateway. Manual,
automatic and admin batch updates protect divergent/ahead previews. Existing
unversioned libraries retain the earlier update behavior. Legacy status files
without ancestry retain compatibility: **seed ancestry under the updater lock
before deploying this gateway/provisioner change**; do not assume inequality proves
an upgrade. App Update explains a protected build instead of offering a rollback.
Admin batch updates touch only approved/running libraries and preserve update
preferences. It uses the existing container-restart mechanism: select an idle time
(no downloads/renders); there is no new live busy-job admission guard.

## Gateway-driven Hudl refresh and new-match emails (owner request 2026-11-27)

The gateway (`app/match_watch.py`, Gateway repo docs/EMAIL.md) now calls each hosted library's
helper directly through its web container: `POST /helper/account/action {"action":"refresh"}`
every three hours (one library per ten-minute round, skipped when busy, unconfigured or
refreshed in the last hour), then `GET /helper/library` 20 minutes later. The helper contract it
relies on: `/account` keys `configured`, `busy`, `catalogue_checked_at`; `/library` items `id`,
`title`, `age_group`/`age_groups`, `season_label`. Changing those breaks new-match emails silently.
A refresh at the storage limit is refused by `_hosted_refusal` (it is in DOWNLOADS).
