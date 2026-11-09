# 090: Hudl capture through normal browser sign-in

**Status:** Building (offline checks passing; live capture validation in progress)
**Sensitive:** YES: login, authenticated read-only requests, verified new media.
Follow the repository's `/safe-change` procedure. Owner permission: decision 002.

## What is missing

Normal users can watch footage and Sportscode tags but have no download/export
controls. The owner attests permission for app automation and archiving.

## What changes

Public entry point: `https://www.hudl.com/login`. Each user signs in directly
with Hudl in a visible browser. The local capture helper uses an ephemeral
browser context, observes the actual playback manifest and read-only tagging
responses, saves a selected match, and produces an importable `.tags.csv`.
No guessed match identifiers, private endpoint discovery loops or stream URLs
stored in the app. Prefer observing requests over replaying authenticated queries.

Observed contract (real values omitted): `data.taggingSessions.items[]`, session
`dataSource.feedType = SportsCode`, `taggingSessionMetadata.isSyncedToVideo`,
`moments.items[]` with `id`, `momentId`, `startTimeMs`, `endTimeMs` and `tags[]`
(`key`, `values`). `HUDL_CODE` contains the timeline row label, which can be
an event category or a player name. Ask the user which codes represent players;
never guess a roster from capitalisation or temporal overlap. Preserve remaining
labels as categories. Times are video-relative only for synced sessions.

Observed media: HTTPS Hudl HLS master with muxed audio/video renditions and
relative child manifest links. Download serially, validate all referenced URLs,
stop on challenges/401/403/429, reject encrypted/live/unsupported manifests.
Remux only locally downloaded media so external URLs never reach ffmpeg logs.
Verify duration before publishing under the final filename; never overwrite.

## What must NOT change

No passwords/cookies/session state/signed URLs in repo, logs or fixtures.
No Hudl mutations (including Create Clips), access-control bypass, increased
retry loops, footage in Git, or overwriting library/inbox originals. Keep the
existing local import path and all existing tests intact. Other users need
their own permissions; owner's attestation is not blanket authorization.

## Non-goals

No bulk season scraping, DRM handling, inferred player identity, or cross-product
API assumptions. Browser sign-in is not OAuth integration with Football Memories.

## Open questions

Playwright runtime dependency approved by the owner. The companion runs on the
host at `127.0.0.1:8766`; Settings accesses it directly, including when the main
app runs in Docker. Exact player-code choices and actual capture remain unverified.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| Sportscode conversion | Correct milliseconds, durations, labels and explicit players | Unsynced session / invalid range refused |
| Manifest parsing | Only HTTPS Hudl VOD references, deterministic rendition | Foreign host, encrypted media, live manifest refused |
| Downloads | Verified new file, usable sidecar, original bytes intact | Truncation, auth/rate-limit failure, target collision |
| Session handling | No persisted auth data or raw exception/URL output | Synthetic secret never appears in failure output |

## Real-account check

Owner signed into Safari. Agent opened one accessible match, inspected playback
and tag responses, and paused playback. No Hudl mutations. A full-match download is underway after normal Chrome sign-in.
Capture check must compare imported timeline ranges with the real player and
verify saved video with ffprobe. Never commit real capture data.

## Verification

Browser, HLS capture, companion and Settings controls implemented. Offline tests
cover real ffmpeg assembly, truncated segments, auth/rate-limit stops, scoped
origins/hosts and input redaction. First live runs exposed cancelled prefetches
and padded tag times; regression tests added. Final capture validation pending.
