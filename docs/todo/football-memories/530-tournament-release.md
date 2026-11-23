# 530: Tournament squad review and general release

**Status:** Done: released on main and deployed to all app instances
**Branch:** `codex/tournament-release`

Owner requests squad dropdown (existing squad or create new), removal of + Add tournament
and a browse-only All matches view, then full verification, commit/push and deployment
to every hosted library and local app. This supersedes spec520's admin-only restriction.
Owner approves updating outdated tests for the replaced selection/free-text behavior.

Cached Liverpool audit: six U11 games, two genuine cohorts; third displayed squad is
actually two Team unassigned recordings. Both have 17 player labels and substantial
activity from both established squads. Names are neither persisted in this spec nor
printed. Owner explicitly chooses to leave both for review, not assign Squad 2 manually.
Show 2 squads and a separate needs-review group; do not force an unsupported assignment.

Improve detector: incidental overlap of three players must also cover at least half
of the smaller roster before making a cohort ambiguous. Keep complete-link similarity,
sparse/bridge safeguards, stable labels and durable manual corrections. Cover strong
unique cohort vs incidental overlap, and a broad recording containing both squads.

Release grouped UI by default (explicit flag0 remains rollback); existing legacy UI
regressions explicitly test rollback, new integration tests cover the released view.
No new dependencies, source request policy, credentials, files or schema changes.
Restore admin automatic-update preference to its pre-preview true after release.
Preserve other update preferences, all databases and footage. Preflight each library
for idle sources and no renders; use normal updater/provisioner and local compose.

Browser verification exposed stable-label renumbering after manually assigning a mixed
recording to an existing squad. Added a failing regression and separate allocated-label
tracking so a reserved manual name does not rename the original cohort. Synthetic real-API
correction keeps two squads after assignment; creating a new squad remains deliberate.

Final gates: 825 SQLite, 825 PostgreSQL, 767 frontend; lint/format/mypy/types/build/schema
pass. Synthetic desktop/phone real-API dropdown correction/create and browse-only checks
pass. Runtime rollout complete: four hosted libraries plus local app; see HANDOFF.

Installed code `6ad1a00`; all hosted backend/web/capture versioned images and local backend/
frontend healthy. Default tags/latest/shared crests updated normally. All database and
other containers preserved; admin auto-update restored true, other preferences unchanged.
Live Liverpool remains two assigned squads and two review games. No source/footage changes.
