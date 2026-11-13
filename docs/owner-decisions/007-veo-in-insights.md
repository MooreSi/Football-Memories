# 007: Veo matches in insights, player hub and reports

**Status:** open
**Raised by:** spec 260 session, 2026-11-13

## The question

Veo highlights are tagged by event type (GOAL, SHOT, SAVE...), sometimes by Veo's
AI; `involved_players` and the team side were empty on every match looked at. Hudl
codes include player names, which the player hub, insights, opponents and reports
read. Should Veo matches appear in those pages, and how?

1. Not at all: Veo matches only in All matches and their own match page.
2. As team-level matches: score, opponent, goals and shots in insights and the
   season report, never in a player's hub.
3. With the owner tagging the player on Veo highlights in this app.

## Provisional default in use

Option 1. Veo items are served on `/veo/library` only and are not mixed into
Hudl's `/library`, so no Hudl page changes.

## What changes if the answer differs

Option 2 adds Veo matches to the season views with a source badge; option 3 adds
a player picker on the Veo match page saved in `preferences`.
