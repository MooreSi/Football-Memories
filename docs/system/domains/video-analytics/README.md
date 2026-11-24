# Video analytics

The private [worker repository](https://github.com/MooreSi/Football-Video-Analytics)
owns models, local bounded inference and append-only artifacts. The app owns Video
Lab; the gateway owns full-admin/completed-MFA/CSRF/owner guards and review records.
Read specs550–590 under `docs/todo/football-memories/` and worker HANDOFF before work.

Owner priority (24 November 2026): identify players and their correct teams first;
passing/tackling stats have little value without trustworthy attribution. Role,
team, jersey evidence and individual identity are distinct. Similar clothes or a
track ID do not establish a person's identity. No face/voice/gait identification.

Current opt-in worker identification uses source-bound multi-view kit/role
exemplars, timestamped pitch polygons and track consistency; it does not newly
attribute football actions. Referee/goalkeeper/non-player roles need explicit
examples. Do not promote unreviewed model results or Veo tags to confirmed facts.

Learned on real footage: indoor pale-front/grey-back kits defeat one colour;
540p distant torso crops can contain only a few usable pixels. Small-sided pitch
boundaries can be yellow even when an outer white line is visible. Pitch geometry
must follow the actual game/camera; do not interpret one lower line as a complete
pitch. Calibrated appearance and same-match audits are experimental, not evidence
of held-out-match accuracy. Always report precision AND coverage, role confusion,
sideline leakage and unresolved labels. Explicitly distinguish assistant visual
audits from independent human labels, and development frames from withheld ones.

Preserve original source and completed results. New calibrations/runs use new
outputs and verify source/inherited hashes. Footage, roster data, profiles and
weights remain outside Git. No worker public port, hidden model download or new
source account flow. App/gateway deployment is a separate operation.

Full-resolution trial still only55% outfield kit coverage; role accuracy and
sideline errors must be reported separately. A correct kit on an assigned player
can coexist with missed players, wrong-role keepers, sideline team leaks and
unstable IDs. Staff examples are useful but do not replace a learned role model.
Referees can change to a bib mid-recording; opposite keepers need independent kit
and team evidence. Do not credit a third kit or a nearby goal with a club identity.

A fresh output directory initially contains inherited parent files. Wait for the
CLI/owning job to complete before evaluating or serving it; mere file existence
can score the parent's labels as though the new stage had finished. Keep audit
labels frozen before inspecting predictions and source-bound to the sample.

CLI result folders are not automatically visible in Video Lab: it reads the
runtime `samples.json` catalogue and owner-bound completed `jobs/<id>/result`.
The two identification trials were explicitly published there on24 November,
with full copied-file hashes checked, after verifying the existing approved admin
owner from gateway metadata. Do not create a session or bypass MFA to register
local results; normal API access still requires the signed-in full admin. Run
buttons currently use job prefixes rather than fixture names.
