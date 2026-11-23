# 520: Grouped Library admin preview

**Status:** Built and verified; isolated deployment pending
**Sensitive:** no; cached metadata and existing APIs only

## Approved design
Owner selected mockup 1 (Grouped Library), explicitly admin-account-only until review.
Replace the permanent tournament settings panel with compact All matches/Tournaments
views, expandable dated event rows, squad cards and squad match drill-down. Retain
rename, correction, multi-select assignment, filters, real scores and score coverage.
Ordinary games remain separate. Preserve the existing dashboard, footage and detection.

## Release isolation
Feature branch `codex/admin-grouped-tournaments-preview`; do not push main. Build flag
`VITE_FM_GROUPED_TOURNAMENTS` defaults off. Build versioned preview images without moving
shared :hosted tags, updater latest pointer or crest service. Register only as an available
version, then move admin through the existing gateway/provisioner. Temporarily pause admin
automatic updates (previously true) so normal releases cannot replace the preview. Record
prior setting for restoration after review. Other accounts, database containers, source
credentials/caches and local running app remain unchanged. No gateway code change.

## Verification
Test-first event/squad drill-down, mixed-source matches, ordinary match separation,
age/season scoping, whole-event rename/corrections/selection, unknown-score coverage,
flag-off legacy behavior. Existing tests unchanged. All normal gates, preview build and
synthetic desktop/phone browser comparison to mockup 1 before admin-only deployment.
Snapshot runtime and updater/default tags before/after; confirm no other account receives
preview images. No source account refresh/login/stream needed for verification.
