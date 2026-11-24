# 580: Video Lab review workspace

Status: Deployed to admin preview (2026-11-24, app a4b50f3). Owner feedback on the deployed spec 570 preview.

## Problems reported

1. Clicking match metadata seeks but does not play; no next/previous within a filter.
2. "Tag team jerseys" asks for hand-picked colours while Team statistics already
   shows detected kit colours. Confusing, and a hand-picked hex rarely matches a
   sunlit or shaded shirt.
3. "Review actions and players": choosing a track does nothing visible; only
   goal/pass/tackle suggestions appear (drive, header, throw-in and the rest are hidden).
4. Players cannot be assigned by clicking the video. Goalkeepers are called referees.
5. Analysed actions are never split by team (Veo tags are).
6. Phone layout wastes desktop space; tools should sit beside and on the video.

## Findings

- T-DEED SoccerNetBall 2024 outputs type and time only: no team, no actor. Every
  analysed action is therefore "unknown". Actor candidates come only from ball
  proximity; the ball is detected in 466 of 1,799 samples, so 8 of 52 actions had any.
- Torso LAB colour vs a hand-picked hex leaves most players unassigned (6.8%).
- Tested local football YOLO (ball/goalkeeper/player/referee, Football Analysis v2,
  mAP50 0.95 on its broadcast validation set): on Veo frames it misses almost every
  player and finds false balls. Not adopted without Veo fine-tuning.
- Local SportsReID ViT-B/16 (SoccerNet ReID, Football Analysis v2) embeddings, after
  fixing a silent key-name mismatch (`mlp.linear_1/2` → `mlp.0/3`; v2 runs with random
  MLP weights), cluster real Veo crops into: dark non-players (referee, coaches,
  spectators), and the two kits split by sun/shade. Good groups, not teams by themselves.
  This follows the Roboflow `sports` team-classification recipe (embed crops, cluster)
  with a football ReID backbone instead of SigLIP. No new dependency or download.

## Design

Worker 0.4.0 (cached detections, no detector rerun, parent untouched):
- `appearance.py`: pinned SportsReID loader (sha256, `weights_only`), per-track
  embedding from up to 6 crops, 24-d projection, k-means appearance groups,
  thumbnail sprite. Artifacts `track_appearance.json`, `track_thumbs.jpg`.
- Actor candidates for every action: people nearest the ball at the action
  (`ball_nearest`), else nearest the camera's focus (`camera_focus`, lower
  confidence: Veo's virtual camera follows play). Never confirmed.
- Goalkeeper candidate: kit outlier that stays near a frame edge of play where the
  goal is visible is deferred; v1 exposes outlier groups for one-click "goalkeeper".

Gateway: review gains `track_labels` (track → team own/opponent/none, role
player/goalkeeper/referee/other), `group_labels`, event `team`, all spotter/Veo
action types and `rejected_suggestions`. Old reviews load unchanged.

App (desktop-only workspace): left rail of metadata filters and moments with
play-selected, previous/next; centre video with clickable overlay; right inspector
for the current moment (approve, reject, type, team) and the selected person (team,
role); team setup shows appearance groups as thumbnails to map in one click.
Team assignment propagates live in the browser from labels (group label, then
nearest labelled tracks in appearance space). Statistics split Veo and analysed
actions by team, marking estimated vs approved. Replaces the colour picker and the
old review panel.

Honesty: estimated teams are labelled "estimated"; only owner approval confirms.
Tests first for each behaviour; synthetic browser review; real cached run timing.

## Result (2026-11-24)

- Workspace: moments rail (source/team/type filters, counts, play-through, previous/next,
  keys), clean `sample.mp4` under a clickable overlay (`annotated.mp4` has boxes burned in),
  inspector (approve as Our/Opponent/unknown with type, reject, label the clicked person,
  add a missed moment), team setup with look-alike groups, autosaved revisioned labels.
- Team propagation, calibrated by eye on the real ten-minute match: your label, then the
  clearly closer labelled kind (combined similarity ≥ 0.45, margin ≥ 0.08; 0.6 when only one
  kind is labelled), then a group label. Nine labels gave 406 of 2,106 tracks a suggestion
  with no visible team mistakes on three checked frames; the rest stay unassigned.
  Group labels rank last: group 1 (referee, coaches) also held a few players.
- Analysed actions split by team: with those nine labels, 5 Our team and 10 Opponent
  estimated, 37 unassigned, all awaiting approval.
- Not done: automatic goalkeeper detection (label a goalkeeper once; similarity spreads it);
  named-player identities and complete-interval training labels from the old panel were
  not carried into the new workspace (gateway and trainer still accept them).

## Follow-up: player rings (2026-11-24)

Owner asked for smoother following and a broadcast-style marker. Overlay now interpolates
between 0.36 s detection samples, repaints per video frame, and draws team-coloured foot rings
with a glow and label pill for the selected person. Tests: `LabVideo.test.ts` (interpolation
checked by mutation). Deployed to admin preview 2026-11-24 (app bca4687).
