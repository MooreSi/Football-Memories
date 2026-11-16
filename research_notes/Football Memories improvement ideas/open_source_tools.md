# Open-source tools and models for a local-first grassroots football archive

Scope: tools runnable on an Apple Silicon Mac (natively or in Docker) that could plug into an app holding full-match MP4s (Veo panoramic/follow-cam, Hudl 1080p), millisecond event timestamps, team-sided event types and scores. Researched 2026-11-16. Facial recognition and biometrics are ruled out by the owner; mentioned only where a tool ships them.

Cross-cutting platform constraint (applies to every ML item below):
- Docker Desktop on macOS runs containers in a Linux VM with no Metal/MPS GPU passthrough; `torch.backends.mps.is_available()` returns False inside a container. Docker's own team says its vllm-metal backend must run natively on the host because "there is no GPU passthrough for Metal in containers" — [Docker blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/); [Apple Silicon, Docker and ML](https://project-delphi.github.io/ml-blog/posts/docker-on-apple-silicon). An unofficial host-side MLX daemon proxied to containers exists (docker_mlx_cpp), unverified — [MLX discussion #3349](https://github.com/ml-explore/mlx/discussions/3349).
- Inference: any GPU-accelerated analysis job (detection, embeddings, Whisper) should be a native macOS worker process (uv/Python with PyTorch MPS, MLX, Core ML, or whisper.cpp Metal) that the Dockerised backend calls or queues work for; in-container ML is CPU-only and will be slow on full matches.

## Action spotting / auto-highlight (SoccerNet, T-DEED, E2E-Spot, 2024-2026 SOTA)

### Takeaway
SOTA action spotters (T-DEED and descendants) have pretrained weights, but they are trained on professional broadcast footage, are GPL-3.0, and a 2024 study measured a clear performance drop on amateur AI-piloted camera footage (the Veo-like case). Since the app already has human-tagged event timestamps from Veo/Hudl, spotting is most valuable as a "suggest untagged moments" aid, not a replacement.

### Cited Findings
- SoccerNet 2025 Team Ball Action Spotting: 12 ball-action classes; winner (int8.io) reached 60.03 Team-mAP@1 vs T-DEED baseline 51.72; winner re-implemented T-DEED in the open-source "dude.k" framework and pre-trained on 500+ broadcast matches before fine-tuning — [SoccerNet 2025 Challenges Results, arXiv 2508.19182](https://arxiv.org/html/2508.19182v1)
- The report says nothing about amateur footage; the dataset covers English league broadcasts — [arXiv 2508.19182](https://arxiv.org/html/2508.19182v1)
- T-DEED repo (arturxe2/T-DEED): GPL-3.0 licence, plus a separate "LICENSE E2E-Spot" file (it builds on E2E-Spot); ~41 stars, 40 commits; pretrained checkpoints on Google Drive (e.g. `SoccerNetBall_challenge1`); supports SoccerNet, SoccerNetBall, FineDiving, FigureSkating, FineGym, Tennis; inference resolution must match training, e.g. 796x448 for SoccerNetBall; GPU requirements not stated — [GitHub arturxe2/T-DEED](https://github.com/arturxe2/T-DEED)
- Cabado et al. (CVPRW 2024) "Beyond the Premier" tested SoccerNet-trained SOTA spotters on four domains: pro broadcast, unedited pro main camera, semi-pro AI-piloted camera (Luxembourg), amateur AI-piloted camera (Sevilla), and found a clear performance drop moving to amateur AI-piloted cameras; they also propose a transfer benchmark — [CVPRW 2024 paper](https://openaccess.thecvf.com/content/CVPR2024W/CVsports/papers/Cabado_Beyond_the_Premier_Assessing_Action_Spotting_Transfer_Capability_Across_Diverse_CVPRW_2024_paper.pdf); [arXiv 2410.01304](https://arxiv.org/abs/2410.01304)
- SoccerNet-v2 has 17 action classes, broadcast-only training footage — [SoccerNet-v2 paper](https://orbi.uliege.be/bitstream/2268/253781/1/SoccerNet-v2.pdf)
- A 2025 audio+video highlight detector (custom CNN on Mel-spectrograms + unnamed pretrained image model) reported audio accuracy 0.89 and video 0.83 on 5 s chunks of professional matches; architecture under NDA, no code or weights released — [arXiv 2501.16100](https://arxiv.org/html/2501.16100v2)
- PlayerTV (2024) is an open-source framework for player tracking/identification to produce automatic highlight clips — [arXiv 2407.16076](https://arxiv.org/html/2407.16076v1)
- A practitioner building a local system on amateur Saturday-football footage reports amateur single-camera footage is "a different, harder world" with very little training data — [world fut coach (Substack)](https://dcrey7.substack.com/p/world-fut-coach)

### Inferences
- The app's existing Veo/Hudl event list (ms timestamps, team-sided types) is effectively higher-quality labels than any off-the-shelf spotter will produce on this footage. That data could be used to fine-tune T-DEED on the owner's own matches (locally), but GPL-3.0 means distributing a modified version obliges releasing source; running it privately on the owner's Mac does not trigger distribution.
- Class overlap: SoccerNet Ball classes include passes, shots, throw-ins, free kicks etc.; mapping to the app's types (goal, shot, corner, foul, free kick, throw-in, save, chance) is feasible but "save" and "chance" have no direct counterpart (needs verification against class list).
- Practical first step is cheaper: rank existing tagged events using audio excitement (below) and motion energy, rather than spotting from scratch.

### Gaps
- Exact mAP numbers per domain in the Cabado paper (PDF returned 403; not retrieved).
- Whether the dude.k framework / winner's weights are public (report gives no link).
- No benchmark found for T-DEED on Apple MPS; no CoreML/MLX port found.
- E2E-Spot's own licence text not read.

## Detection, tracking, pitch homography, heatmaps and minimaps

### Takeaway
Roboflow `sports` (MIT) + `supervision` give the reference soccer pipeline (players, ball, pitch keypoints, radar), and SoccerNet's sn-gamestate (GPL-3.0) is the full research pipeline. The detector choice drives licensing: Ultralytics YOLO is AGPL-3.0, RF-DETR (Nano-Large) is Apache 2.0. On a single wide/panoramic amateur camera, calibration and ball detection are the main risks.

### Cited Findings
- roboflow/sports: MIT licence, ~5.5k stars, `examples/soccer` with linked datasets for player detection, ball detection and pitch keypoint detection — [GitHub roboflow/sports](https://github.com/roboflow/sports); licence also listed at [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Froboflow%2Fsports)
- The soccer keypoint detector in that repo is YOLOv8-based; Ultralytics YOLO is AGPL-3.0, so using those weights/code carries AGPL obligations — [search summary of repo docs, ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Froboflow%2Fsports); Roboflow keypoint datasets on Universe are CC BY 4.0 (e.g. "soccer keypoints") — [Roboflow Universe](https://universe.roboflow.com/cv-8xzlj/soccer-keypoints)
- Roboflow's camera calibration write-up for sports keypoints/homography — [Roboflow blog](https://blog.roboflow.com/camera-calibration-sports-computer-vision/)
- RF-DETR: `rfdetr` package Apache 2.0; Nano/Small/Medium/Large detection and all segmentation sizes Apache 2.0; XL/2XL (and per one page Atto/Femto/Pico) under Roboflow Platform Model License 1.0. YOLO11/YOLO26 are AGPL-3.0; shipping or network-serving AGPL models requires releasing app source or buying an Ultralytics licence. Roboflow concedes lightweight CNNs (YOLO) still win on CPU-only hardware. (Vendor sources.) — [Roboflow RF-DETR licensing](https://roboflow.com/model-licenses/rf-detr); [RF-DETR vs alternatives](https://blog.roboflow.com/rf-detr-vs-alternatives/); [Roboflow licensing](https://roboflow.com/licensing)
- sn-gamestate (SoccerNet Game State Reconstruction baseline): GPL-3.0; ~472 stars; last log entry 2026-05-01 (TrackLab 1.3.24); components: YOLOv11 detection, PRTReid re-ID, StrongSORT tracking, TVCalib / PnLCalib / "No Bells, Just Whistles" calibration, MMOCR jersey numbers; weights auto-downloaded; conda pins `pytorch-cuda=11.7` (CUDA-oriented, no Mac notes) — [GitHub SoccerNet/sn-gamestate](https://github.com/SoccerNet/sn-gamestate)
- SoccerNet 2025 GSR winner scored GS-HOTA 63.90 vs baseline 29.01, still far from solved on broadcast footage — [arXiv 2508.19182](https://arxiv.org/html/2508.19182v1)
- Single moving/zooming camera must re-solve pitch mapping every few frames, and mapping errors propagate into distance/speed; ball is the hardest object (small, fast, low contrast); suggested stack YOLOv8 with tiling plus TrackNet-style heatmap ball detector — [Fora Soft blog](https://www.forasoft.com/blog/article/ai-sports-video-analysis); [GetStream ball tracking](https://getstream.io/blog/ai-ball-player-tracking/)

### Inferences
- Veo panoramic recordings (fixed wide stitched view) are actually easier for homography than broadcast: one calibration per match may hold for the whole panoramic stream if the camera did not move. Veo "follow-cam" exports reintroduce per-frame calibration. Hudl 1080p depends on the camera operator.
- Grassroots pitches (small-sided, cones, shared pitches with overlapping lines) will confuse keypoint models trained on full-size pro pitches; a manual 4-point calibration UI per match (click corners) plus `cv2.findHomography` is a robust fallback and needs no model.
- License-clean stack proposal: RF-DETR (Apache) or a permissively licensed detector + supervision (MIT, per roboflow docs) + ByteTrack (MIT per its repo, not verified this session) + manual homography -> per-player heatmap / minimap. Avoid Ultralytics unless the app stays private and unredistributed (AGPL network clause matters only if served to others).
- Veo and Hudl already compute some of this (Veo physical/tracking data was checked in commit 346613c); first check what the provider exports before building tracking.

### Gaps
- No measured accuracy of roboflow/sports or sn-gamestate on amateur/Veo footage found.
- supervision and ByteTrack licences, last-commit dates not fetched this session.
- No sourced benchmark of RF-DETR or YOLO speed on M-series (MPS/CoreML).

## Jersey number recognition (follow one player without faces)

### Takeaway
The canonical open pipeline (Koshkina & Elder, PARSeq-based) reports 87.4% tracklet accuracy on SoccerNet broadcast footage; 2025 challenge entries increasingly use vision-language models. At grassroots (low resolution wide shots, kids' kit, numbers often small or absent) expect substantially worse, so use it as a suggestion with user confirmation.

### Cited Findings
- Koshkina & Elder "A General Framework for Jersey Number Recognition in Sports Video": legibility classifier, pose-based torso localisation, PARSeq recognition; 91.4% accuracy (hockey images), 87.4% (SoccerNet tracklets); code/models at github.com/mkoshkina/jersey-number-pipeline — [arXiv 2405.13896](https://arxiv.org/html/2405.13896v1)
- SoccerNet Jersey Number dataset: 4,064 tracklets averaging 482 frames; some tracklets labelled "1" were actually the ball — [arXiv 2405.13896](https://arxiv.org/html/2405.13896v1)
- Fine-tuning PARSeq significantly beats zero-shot — [chatpaper summary](https://chatpaper.com/es/paper/22671)
- An uncertainty-aware method at 85.62%; confidence-weighted frame aggregation improves tracklet accuracy — [UBC Okanagan student report](https://mahatav.github.io/research/Jersey_Number_Recognition.pdf)
- 2025 GSR entries: winner used LLaMA-3.2-Vision for role/jersey/colour; another used Qwen2-VL; one used PARSeq; one named jersey recognition as its main difficulty — [arXiv 2508.19182](https://arxiv.org/html/2508.19182v1)
- sn-gamestate uses MMOCR for jersey numbers — [GitHub SoccerNet/sn-gamestate](https://github.com/SoccerNet/sn-gamestate)

### Inferences
- Jersey OCR is not biometric (reads a printed number), so it fits the owner's no-face rule; re-ID models like PRTReid use appearance embeddings of the whole body, which is closer to biometric tracking and arguably should be avoided or treated cautiously.
- Simpler grassroots approach: user marks the child once per match (click a box), tracker follows, jersey OCR used only to re-acquire after occlusion; combine with team colour clustering.
- Small local VLMs (Qwen2-VL-class via MLX) are a plausible way to read numbers from crops, per 2025 challenge use.

### Gaps
- No grassroots/amateur jersey recognition accuracy found.
- Licence and maintenance of mkoshkina/jersey-number-pipeline not verified.

## Audio-based excitement / cheer / whistle detection

### Takeaway
PANNs (AudioSet-pretrained, 527 classes) provide off-the-shelf tagging that should include cheering and whistle classes; this is a cheap, local signal for ranking moments. Evidence on touchline (parent) audio is absent, and Veo/Hudl audio quality varies.

### Cited Findings
- PANNs: large-scale pretrained audio networks trained on AudioSet (1.9M clips, 527 classes); code and weights at github.com/qiuqiangkong/audioset_tagging_cnn — [arXiv 1912.10211](https://arxiv.org/abs/1912.10211v5); [ar5iv](https://ar5iv.labs.arxiv.org/html/1912.10211)
- Audio-only highlight classification on pro matches reached 0.89 accuracy (custom CNN on Mel-spectrograms; code not released) — [arXiv 2501.16100](https://arxiv.org/html/2501.16100v2)

### Inferences
- AudioSet ontology includes classes like "Cheering", "Applause", "Crowd", "Whistle" (from prior knowledge; verify label IDs). Per-second scores over a match give an excitement curve to rank existing tagged events and surface untagged peaks (parent cheers often mark goals/saves at grassroots).
- YAMNet (TensorFlow, AudioSet classes) is an alternative; licence believed Apache 2.0 (unverified this session).
- Referee whistle detection can help find restarts (free kicks, fouls) and half boundaries; at grassroots the referee may be a parent and whistle presence is inconsistent.
- Runs fine on CPU; a 90-minute match at 1 s hops is cheap.

### Gaps
- PANNs repo licence not read (arXiv page had a licence link only).
- No study of cheer detection on amateur sideline audio found.
- Whether Veo panoramic recordings carry usable audio not checked.

## Semantic video search (CLIP / SigLIP, Immich smart search)

### Takeaway
Immich's smart search shows the pattern: CLIP embeddings per item in a separate ML service, queried locally by text. For this app, embedding sampled frames (or event-window keyframes) with an open CLIP/SigLIP model into pgvector would let a user type "diving save", but generic CLIP on wide, low-detail amateur frames will be weak; ranking within already-tagged events is more realistic.

### Cited Findings
- Immich runs ML in a separate `immich-machine-learning` container; smart search uses CLIP, default ViT-B/32 with larger models available (more RAM/time); changing model requires re-running jobs; works offline once indexed; default model weak for non-English — [Immich docs: searching](https://docs.immich.app/features/searching); [needtoknowit guide](https://needtoknowit.com.au/blog/immich-ai-features-guide.md); [PixelUnion blog](https://pixelunion.eu/blog/2026/04/immich-smart-search/)
- Immich hardware acceleration docs list ARM NN (Mali) etc.; no Apple Silicon GPU path in the container — [Immich ML hardware acceleration](https://docs.immich.app/features/ml-hardware-acceleration)
- roboflow/sports soccer example uses SigLIP embeddings for team classification (per repo's notebook; repo page itself did not describe it) — [GitHub roboflow/sports](https://github.com/roboflow/sports) (weakly sourced)

### Inferences
- The app already uses PostgreSQL 17; pgvector would store embeddings without a new service. open_clip (MIT) and SigLIP (Apache 2.0) weights are the usual choices (licences from prior knowledge, verify). MLX or Core ML ports run them natively on M-series.
- Embed crops around the ball/action region rather than full panoramic frames, or the event window's frames averaged; full 4K panoramic downscaled to 224 px will lose the players.
- Immich itself is AGPL-3.0 (prior knowledge, verify): copy ideas (memories "on this day", smart search UX), not code.

### Gaps
- No evaluation of CLIP/SigLIP text-to-frame retrieval on football actions found.
- Immich on Apple Silicon performance unsourced.

## Event-data libraries without pitch coordinates

### Takeaway
kloppy, socceraction (VAEP/xT), floodlight and databallpy are built for coordinate-bearing event/tracking data; xT and VAEP need x/y locations, so they add little to timestamp+type-only events. mplsoccer is useful only once coordinates exist (heatmaps, pitch plots).

### Cited Findings
- databallpy: MIT licence, actively maintained (v0.7.x, JOSS 2026 paper), loads/synchronises event and tracking data, has kloppy integration — [GitHub Alek050/databallpy](https://github.com/alek050/databallpy); [JOSS paper](https://www.theoj.org/joss-papers/joss.10223/10.21105.joss.10223.pdf); [releases](https://science.ecosyste.ms/projects/808331/releases)
- floodlight: open-source high-level team-sport data analysis framework (JOSS 2022) — [JOSS](https://joss.theoj.org/papers/10.21105/joss.04588); [docs](https://floodlight.readthedocs.io/)
- socceraction: Python package for soccer event stream analysis (SPADL, VAEP, xT) from KU Leuven — [docsearch index of ml-kuleuven/socceraction](https://docsearch.algolia.com/mcp/docs/repo/ml-kuleuven/socceraction)

### Inferences
- Without x/y, useful derived stats are time-based: momentum curves (events per team per 5 min), shot/corner ratios, goal-time distributions across a season; these need no library.
- If manual homography or Veo tracking export gives coordinates later, kloppy (standard event model, can read multiple providers) + mplsoccer (heatmaps) become worthwhile. Licences believed: kloppy BSD-3, socceraction MIT, mplsoccer MIT, floodlight MIT (prior knowledge, not verified this session).

### Gaps
- Licences/maintenance for kloppy, socceraction, mplsoccer, floodlight not fetched.
- Whether kloppy can parse Veo or Hudl export formats unknown.

## Auto-reframing to vertical 9:16

### Takeaway
Google AutoFlip (MediaPipe, 2020) is the known open-source reframer but is old and must be compiled; for football, a ball/player-centroid crop path from the detector/tracker, smoothed and rendered with ffmpeg `crop`, is the more direct route.

### Cited Findings
- AutoFlip released Feb 2020 on MediaPipe; analyses content, tracks salient objects, outputs same duration in target aspect ratio; needed to be built from source — [Google Research blog](https://research.google/blog/autoflip-an-open-source-framework-for-intelligent-video-reframing/); [Google Open Source blog](https://opensource.googleblog.com/2020/02/autoflip-open-source-framework-for.html)

### Inferences
- With ball or "my player" tracks, a 9:16 crop window centred on a smoothed (e.g. exponential or Kalman) target trajectory, clamped to frame bounds, then ffmpeg crop with per-frame expressions or sendcmd, is a small, testable feature. Veo panoramic source (wide, high-res) leaves the most headroom for a vertical crop.

### Gaps
- Current maintenance status of AutoFlip in MediaPipe not verified; no maintained open-source sports-specific reframer found.

## Self-hosted media manager features worth copying; chapters in MP4

### Takeaway
Embedding event markers as MP4 chapters (ffmpeg FFMETADATA, stream copy, no re-encode) makes tagged moments navigable in Plex/Jellyfin/VLC/QuickTime; Jellyfin trickplay thumbnails and Immich-style memories/smart search are the main UX ideas.

### Cited Findings
- Chapters can be added with an FFMETADATA file and `-map_metadata 1 -codec copy` (no re-encode) — [ImageKit guide](https://imagekit.io/blog/add-chapters-to-mp4-videos/); yt-dlp uses the same approach with `-map_chapters` — [yt-dlp source](https://docs.rs/crate/yt-dlp/latest/source/src/metadata/chapters.rs)
- Jellyfin: trickplay thumbnails stored in metadata folder or beside media; when files lack chapters Jellyfin makes dummy chapters at an interval (set to 0 to disable); embedded chapters are read into its DB; very many chapters can slow/crash players — [Jellyfin forum: trickplay creates chapters](https://forum.jellyfin.org/t-trickplay-creates-chapters); [forum: deleting chapter images](https://forum.jellyfin.org/t-deleting-chapter-and-or-trickplay-images?pid=45249); [forum thread 8848](https://forum.jellyfin.org/printthread.php?tid=8848); [forum thread 11262](https://forum.jellyfin.org/printthread.php?tid=11262)
- The owner's Plex server mounts the Football library read-only (from project memory, not a web source).

### Inferences
- Writing chapters means producing a new file (remux), which touches library files: per project rules, write to a sidecar copy or derived export, never overwrite originals without explicit request. Alternatively write a sidecar chapter file / WebVTT chapters for the app's own player.
- Keep chapters to meaningful events (goals, saves, shots), not every throw-in, given the many-chapters warning.
- Trickplay (sprite sheet of thumbnails every N seconds + WebVTT) is a cheap ffmpeg job that greatly improves scrubbing a 90-minute match in the web UI.
- PhotoPrism (AGPL, prior knowledge) and Immich ship face recognition; that part is excluded by the owner's rule.

### Gaps
- Whether Plex reads MP4 chapter atoms for these files not verified this session.

## Local speech and LLM (whisper.cpp, small LLMs for summaries)

### Takeaway
whisper.cpp is MIT, runs fully on the Apple GPU via Metal, with optional Core ML encoder on the Neural Engine, so touchline transcription is feasible natively (not in Docker). A small local LLM can turn the event list + score into a match summary.

### Cited Findings
- whisper.cpp: MIT licence; on Apple Silicon inference runs fully on GPU via Metal; Core ML encoder via `-DWHISPER_COREML=1` and `generate-coreml-model.sh`; first Core ML run slow while ANE compiles; ">3x faster than CPU" claim is from a fork's README (unverified) — [GitHub ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp); [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fggml-org%2Fwhisper.cpp); [Debian README copy](https://sources.debian.org/src/whisper.cpp/1.8.2%2Bdfsg-2/README.md)
- Docker Model Runner runs vllm-metal natively on host for Mac GPU access — [Docker blog](https://www.docker.com/blog/docker-model-runner-vllm-metal-macos/)

### Inferences
- Touchline audio will contain children's and parents' voices and names: transcripts are personal data and should stay local, never in logs; voice is arguably biometric only if used for speaker identification, which should be excluded (transcription only, no diarisation by identity).
- Match summaries: feed the structured event list (minute, team, type, score) to a small local model (e.g. via llama.cpp, MLX, Ollama or Docker Model Runner) with a strict template; hallucination risk is lowest when the model only rephrases provided facts, and output should be checked against the event list (e.g. score in summary must equal recorded score).

### Gaps
- No sourced evaluation of Whisper on noisy sideline audio.
- Specific small-LLM recommendations (model names, licences, sizes) not researched this session.
