# 730 Video Lab execution nodes

**Status:** Building. Owner requested implementation on 26 November 2026.
**Sensitive:** SSH access to the owner's MacBook; dedicated operator-managed key,
strict host verification, no credentials in the app or gateway runtime.

## What is missing

Video Lab always executes on the mini. Advanced must offer Local, MacBook Pro and
Split for the fully signed-in admin only, and the MacBook must be prepared too.

## Design

Gateway persists an admin execution preference in the private analytics queue and
snapshots it into newly queued admin jobs; other users remain local. Settings show
worker-reported remote readiness. Writes require full admin/MFA and CSRF. Default
is local; running jobs retain their snapshot. Unavailable remote mode fails closed.

The mini remains the single queue coordinator. Remote jobs run in fresh private
temporary directories over authenticated SSH, with matching installed code and
prepared model profiles. Only bounded, regular artifact files transfer. Validate
hashes/source before publication. Never share a live queue between hosts.

Split keeps temporal detection/tracking on the mini, then runs camera/atlas locally
and appearance preparation remotely in parallel, merging verified disjoint outputs
and provenance. Derived single-stage jobs run on their relevant node. No frame
chunking or track-ID stitching; no promise of a measured speed improvement.

## What must not change

Local defaults, 10-minute cap, source account helper, source/review ownership,
artifact access controls, existing source and completed result files. No public
worker port, automatic weight download, or HTTP-controlled host/command/profile.

## Test plan

Gateway: admin persistence/snapshot; anonymous/user/partial-admin/CSRF refusal;
invalid modes and stale readiness refusal; ordinary user's jobs stay local.
Worker: local/remote dispatch, parallel branch overlap, merge integrity, source
mismatch/corruption/path traversal/remote failure, unfinished outputs not published.
UI: save each mode with CSRF, readiness/errors, no requests for non-admin.
Manual: SSH identity, prepared dependencies/model hashes, synthetic remote analysis,
cached-footage append-only integration and browser desktop/375px review.

## Open operational work

Owner confirms user simon and authorised the dedicated Thunderbolt-restricted key.
MacBook M3 Pro/18GB prepared separately with frozen dependencies and matching
models; all three modes passed real SSH synthetic smoke checks. Existing remote
Football Analysis installation is untouched. Deployment verification uses the
MacBook's separate Docker engine with no gateway, preserving its existing apps.

## Verification

Frontend980/194 files, typecheck/build; backend854 SQLite+854 PG/lint/format/mypy/
Alembic; worker223/lint/format/project; gateway500 and4 Docker/lint/format/mypy pass.
Desktop1280/phone375 synthetic admin browser save and no overflow verified against
reference01. Actual SSH synthetic2s and archived15s modes pass source/hash/ZIP/full-decode
checks. One archived smoke run: Local73.84s/Remote52.34s/Split40.87s, mixed machine
load and no repetitions; this is not a controlled throughput benchmark. Remote
produced1612 versus local1616 person boxes (45 samples each); no accuracy claim.
Isolated Docker check in progress. No source-account check is required.
