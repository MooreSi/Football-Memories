# 040: Player Hub, primary player, favourites, viewed, Memories Timeline

**Status:** Building
**Brief:** sections 11, 12, 20 (primary player), phase 4. **Design:** reference 03.
**Sensitive:** privacy only: a child's profile. Store the minimum (display name,
optional shirt number and position). No photo upload yet (needs a new runtime
dependency for multipart uploads: ask the owner first).

## What changes

| Reference 03 element | Our version (real data only) |
|---|---|
| Player card with name and six numbers | Initials avatar, display name, shirt number, position; six numbers = the player's six most frequent **tag counts** (labelled as tag counts, never ratings) |
| My teams (Edit) | Teams the player was tagged with, per season with age group; Edit = name, shirt number, position |
| My numbers / My roles | Shirt number and position (owner-entered) |
| My teammates | Players tagged on the same moments, with shared-moment counts, linking to their hubs |
| Dates column | The player's most recent matches |
| Skills profile radar | **Tag profile** radar of the top six categories (counts) |
| Dynamics bar chart | **Moments per match**, last 10 matches, with trend arrow |
| Phone video feed | **Moments feed**: plays the player's latest moments in a 9:16 frame from the local file, with favourite toggle, prev/next, open match |

Plus: primary player chosen once and kept across restarts (stored in the DB);
favourites and viewed state per moment; Memories Timeline grouped season →
month → match → moment with All / Favourites / Unwatched / by-type views.

## What must NOT change

- Import, library, match playback behaviour and their tests.
- A moment's identity (events table) and existing API fields; new fields only.

## Test plan

| Test | Asserts | Negative control |
|---|---|---|
| primary player persists | set via API, read back from a **new app instance** on the same DB | unset returns null |
| unknown primary player | 404, preference unchanged | |
| profile totals | matches, moments, unwatched, favourites for one player across 2 matches | another player's counts differ |
| team history | U12 in 2026/27 and U13 in 2027/28 both listed for the same team | |
| moments query | cross-match, newest match first, filters: category, favourites, unwatched | filter that matches nothing returns [] |
| favourite toggle | idempotent; shows in match detail and player moments | unfavourite clears it |
| viewed | marks viewed; unwatched count drops | |
| teammates | co-tagged players with shared counts, not the player itself | |
| timeline grouping (frontend) | season → month → match order, newest first | |
| radar geometry (frontend) | point positions for known counts | |
