# 570: Pitch-aware teams and Video Lab metadata rail

Status: Built, verified, deployed to admin preview (2026-11-24, app 6abd627). Sensitive: no new account/authentication or library-write surface.

Separate observed people using visible pitch/white-line evidence and torso kit
colour, with temporal consistency, explicit uncertainty and sideline/official
candidates. Export team/role evidence and per-team observation/action summaries.
Veo Our/Opponent tags and analysed Team A/B groups retain separate provenance;
no guessed club mapping, possession or actor from ball proximity. Goalkeepers
and officials with ambiguous colours stay uncertain. Cropped footage cannot
establish full-pitch metrics.

Video Lab gets the supplied library-style sidebar: blue active filters, counts,
Veo highlights/team events, analysed metadata, per-team summaries and clickable
moments seeking clip-relative time. Old jobs without new artifacts still show
Veo/model metadata. Existing admin/MFA/CSRF/owner guards and immutable original
jobs remain. No source login, dependencies or AWS. New enrichment uses fresh
outputs and cached detections; no overwrite or repeated detector inference.

Test first: two synthetic kits with background/green contamination, outside
people, third-kit ambiguity, missing lines/one kit, stable temporal assignment,
no sideline contribution to team counts, unknown action actor stays unknown.
Media roundtrip manifests/bundles include metadata; source unchanged. Gateway
new artifacts remain manifest/owner/admin guarded. UI source/team/type counts,
filters, seeking, missing metadata/error, old-job compatibility and 375px layout.
Run worker, gateway and app verification, then desktop/phone synthetic browser
review. Real cached ten-minute data enrichment is separate from synthetic tests;
record timing, source/result hashes and honest assignment coverage.
