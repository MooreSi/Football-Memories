# 560: Football model training and reviewed action/player labels

Status: Building. Sensitive: no source credentials/session changes or existing
library-file operations. Owner requests tracking continuity, football-specific
training, goals/passes/tackles and player attribution now, beyond spec550 baseline.

Implement in the private worker: temporal/camera association, four-role football
fine-tuning, trainable action spotting with independent-match evaluation, and
source/time-bounded non-biometric identities. Existing local CC BY4 dataset supports
a real detector pilot. Reviewed Veo action ground truth is missing: provide admin
review controls rather than manufacture labels or turn model guesses into facts.
Evaluate the published T-DEED SoccerNetBall checkpoint as initial suggestions.

Gateway adds full-admin/CSRF/owner guarded GET/PUT review revisions and observed
track descriptors. Bound times/identities to source hash and actual track intervals;
reject stale revisions, conflicting actors, invalid ranges and symlinks. Preserve
all immutable inference outputs; keep versioned corrections separately. The admin
screen follows reference02 workspace and reference01 panels, with pause/seek,
verified goal/pass/tackle points, track-to-player assignments and reviewed intervals.
Unlabelled footage is unknown, never a background negative. Existing review labels
must be explicitly complete before dataset export. Pass/tackle outcomes stay
unknown unless separately established; successful-tackle pretraining retains its
narrower vendor label. No face, voice, gait or biological identity model.

Tests: tracker motion/pan/crossing/occlusion/noise; dataset split/hash/label guards;
action training/checkpoint/release gates and negative controls; identity conflict;
review source/time/revision/security; UI save/CSRF/refusal. Component failures
observed before the corresponding changes. Run all app/gateway/worker gates,
real120-second trials, artifact checks and desktop/375px review. Preview remains
admin-only; no global release, other-family update or AWS infrastructure.
