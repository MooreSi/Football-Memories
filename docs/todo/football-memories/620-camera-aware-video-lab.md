# 620: Camera-aware calibration, learned labels and Veo selection

**Status:** Deployed to the existing admin preview,24 November2026
**Sensitive:** existing Veo helper read-only sample export; no credential/session changes.

## What is missing

Four extrapolated corners and averaged track appearance drift under pans. Runs
have opaque IDs and new games cannot be selected directly from the Veo library.

## Changes

Keep four corner compatibility; allow additional named image/pitch landmarks and
selection of visible corners (exclude off-screen guesses),
fit an overdetermined homography, and blend manual corrections within a camera
segment. Track background optical flow with forward/backward and RANSAC checks,
fall back to feature matching, and stop propagation at uncertain cuts. Learn
source-bound team/role suggestions immediately from saved human labels and
multiple appearance views; keep conflicting evidence unassigned. Persist the
reviewed examples separately from immutable inference artifacts.

Top match box uses the existing Veo cache/helper: choose match, start minute and
1–10 minute duration; cut a verified H.264 derivative through the existing
serialized source flow, import through the owner/admin/CSRF gateway and queue
analysis. Runs become a named match dropdown. No arbitrary URLs or host paths.

## Invariants / non-goals

Preserve old reviews/results, inputs, MFA/CSRF/ownership and service permission;
no hidden weights/dependencies or source login changes. No named identity or
reliable physical/action-statistics claim. Learning suggestions are not labels.
No cross-match automatic training on predictions. Ten-minute worker bound stays.

## Tests

Red-first synthetic tests for extra landmark round trips/invalid geometry,
pan/cut tracking, multiview agreement/conflict, match/duration selection, named
run selection, verified bounded sample export/import and permission/owner/CSRF
refusal. Preserve existing tests unchanged. Full owning-repo gates, UI review
against reference02, and a private local camera benchmark; real Veo acceptance
is recorded separately from offline tests. Deployment is restricted to the existing
admin preview; global latest/shared tags and other libraries stay unchanged.


## Verification

Backend852 SQLite and852 PostgreSQL; ruff/format/mypy/Alembic pass. Frontend856,
types and hosted build pass; synthetic desktop/375px browser controls/save and
no overflow checked against reference02. Worker133/lint/format/project pass.
Real cached120s camera18.508s,599 steps/no rejections;100-pair flow19.33ms versus
ORB87.65ms (both100 accepted);998 tracks/4296 views prepared in111.441s. These
are throughput/integrity checks, not independent identity/pitch accuracy. Gateway
records final API/security gates and CI in its own handoff. No source account
contact, new weights/dependencies or existing footage/result overwrite.


Deployment: gateway2be7fb7 → app6dd4010; worker d70f345 reloaded idle. Exact
4/32-container change; global latest6138b56/shared tags/other28 unchanged; admin
auto-update false. Code CI green in gateway/worker (app no workflow). Admin
health/new bundle/helper route/schema and anonymous401 checked. Prior trials
remain complete. Signed-in production playback/fresh Veo analysis not claimed;
no source operation queued. Existing runs need stage updates to use new camera/
multiview data; original results and saved labels remain.
