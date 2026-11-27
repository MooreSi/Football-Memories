# 740: Core AI player-matching model

**Status:** Deployed to admin and both Macs 26 November 2026 (owner: "Yes, add it", 26 November 2026)
**Sensitive:** no. Touches the MacBook node profile only when deployed (not part of this change).

## What is wrong or missing today

Settings > Advanced offers two player-matching (ReID) models: Standard (PyTorch MPS)
and Neural Engine (Core ML FP16). The Neural Engine export is 2.1x faster but changes
grouping noticeably on two of six cached games (adjusted Rand 0.685, 0.896). On macOS
27, Apple Core AI runs the same model 1.4x faster than Standard and grouped identically
on 4 of 6 games (worst 0.905). Measurements: `docs/system/domains/video-analytics/two-mac-performance.md`.

## What changes

- **Worker:** a third backend `core-ai`. A ReID config may carry
  `"coreai": {"model": <.aimodel>, "sha256": <tree digest>}`; `ReidEmbedder` then loads it
  through the OS Core AI runtime (`USE_OS_COREAI=1`, preferred unit Neural Engine,
  as benchmarked), fixed batch, padding dropped, FP16 input. New
  `--reid-coreai-config`; node status lists `core-ai` where configured; the node
  probe reports `reid_coreai_sha256` and readiness requires it to equal the
  coordinator profile's (both absent is fine). Node profile key `reid_coreai_config`.
  Converter `tools/convert_reid_coreai.py`. Runtime dependency `coreai-core==1.0.0`
  (darwin); converter-only `coreai-torch==0.4.4` in a dependency group.
- **Gateway:** accepts `reid_backend: "core-ai"`, offered only where the heartbeat
  lists it; messages name the chosen model.
- **App:** third radio "Core AI" with an honest description; unavailable notes per model.

## What must NOT change

- Standard stays the default; standard jobs carry no `reid_backend` field.
- The Neural Engine option behaves exactly as now; existing worker, gateway and app tests pass unmodified.
- No silent fallback: a Core AI job never runs on another model.
- Old node profiles (no `reid_coreai_sha256`) stay ready against nodes without Core AI.
- Granted (non-admin) users' jobs never carry the choice.

## Non-goals

- No deployment, model installation or LaunchAgent change on either Mac in this change.
- Does not change the detector (Core AI detector was slower than Core ML).
- Does not claim either grouping is more accurate (no reviewed truth).

## Open questions (provisional default)

- Preferred compute unit: Core AI placed the ViT on the GPU even when preferring the
  Neural Engine. Default: prefer Neural Engine (the measured six-game configuration).

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Worker embedder | batches, order, padding dropped, FP16 input, normalisation | tampered model refused by hash |
| Worker load | OS runtime selected, Neural Engine preferred, provenance | config without `coreai` keeps PyTorch |
| Worker selection | `core-ai` job uses Core AI config locally, in Split and on the node | missing config fails closed, nothing runs |
| Node probe/readiness | reports and pins `reid_coreai_sha256` | mismatch / unpinned node running Core AI not ready |
| Gateway | choice saved, snapshotted, offered only where listed | old heartbeat, MacBook without it -> 409 |
| App | third radio saves `core-ai`; disabled where missing | older gateway -> disabled |

## Real-account check

None needed (no Hudl/Veo surface).

## Verification (filled in when shipped)
- [x] suite green: worker 265 (20 new), gateway 520 (6 new), app 1012 / 199 files (5 new);
  ruff, format, mypy, typecheck, build, project checks pass; no existing test changed
- [x] real worker path: tool-built asset, prepare-review c880cae0 137 s vs MPS 190 s, ARI 1.0
- [x] browser: synthetic harness over the hosted build; save + reload persist, MacBook-missing
  note and disabled radio, 375 px no overflow, same panel styling as the other two choices
- [x] no credential, cookie or token written to the repo, a log or a fixture
- [x] nothing on Hudl modified; no existing library file deleted or overwritten
- [x] real-account check: not needed
- [x] deployed: worker 62a61b0 both Macs, gateway core-ai-f7def11, admin app 0891bb7; default stays Standard
