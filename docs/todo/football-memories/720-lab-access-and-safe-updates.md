# 720: Lab access independent of app updates

**Status:** Code complete; release gated
**Sensitive:** no credential/session changes; metadata access controls only.

## What is wrong or missing today
Admin preview builds are offered the older shared release because update checks compare
inequality. Labs are coupled to an admin identity instead of configurable entitlements.

Observed runtime: admin web ae13328; shared latest 6138b56; shared status currently
has no ancestry field. The shared release is an ancestor of the admin preview.

## What changes
Release updates only supersede ancestor builds (host records release ancestry). Unknown
or divergent preview versions are protected. Admin-only Advanced settings manage separate
Player Lab and Video Lab switches for the admin and individual users. Defaults remain
admin on, everyone else off. Video API checks the entitlement server-side, retaining
owner isolation. Operator sample catalogue remains admin-only; users see their own imports.

## What must NOT change
No credential/session storage changes, source account access, existing media/result writes,
update preference changes or loss of data volumes. Existing tests remain unchanged.

## Non-goals
No lab grant exposes another user's footage or operator training tools.

## Open questions
The admin switches affect that admin's own access; each user has independent switches.

## Test plan
| Test | Asserts | Negative control |
|---|---|---|
| Update ancestry | preview cannot roll back manually/automatically | ancestor can update |
| Advanced API | admin can persist separate user grants | ordinary/partial sessions denied |
| Lab API | grant permits own jobs only and revocation blocks | other-owner job remains 404 |
| Settings/UI | admin-only controls, independent toggles | regular user no Advanced control |

## Real-account check
None needed; offline fixtures and isolated UI only.

## Verification
App backend854 SQLite+854 PostgreSQL, lint/format/mypy/Alembic; frontend977/193,
typecheck/hosted build. Gateway493 with2 existing opt-in skips;4 Docker cases
separately, lint/format/mypy; isolated fresh migration/no drift. Browser synthetic
desktop and375px frame; save works; reference01 compared. Screenshots outside repo.
Additional boundary checks after implementation are identified in HANDOFF.
No Hudl/Veo access or existing library files changed. Deployment remains gated.

## Rollout gate
Code is prepared on codex/local-video-analytics in app and gateway repos. Build
immutable images with FM_BUILD_LATEST=0. Required full provisioner Docker isolation
test refuses an existing live gateway; do not tear production down or bypass its
guard. A separate Docker environment or explicit owner exception is required before
release. Existing metadata-only change still falls under that project requirement.

Once authorized: seed current latest's full ancestry atomically under the updater
lock before gateway/provisioner deployment; deploy gateway first (migration0008),
publish app branch to main/normal release only after checks, and move eligible
libraries while idle. New app image must reach granted users too; old clients still
have hardcoded admin presentation gates. Preserve all data volumes, user update
preferences and ordinary default-denied lab access. Do not enable grants for real
users on the owner's behalf. Never change shared latest to an admin-only preview.

## Prepared artifacts

Code commits app `f604877`, gateway `aaecf42`; gateway CI45778074931 green
(all three jobs). App has no CI workflow. Prepared app images are tagged
`hosted-f604877cb620fed047e0befacc2dc6c3ac80923e`; gateway/provisioner images
`spec720-aaecf42`. These builds changed no running container or shared tag/latest.
Deployment still requires the full Docker isolation check or explicit exception.

