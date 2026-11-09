# Domains

One living directory per part of the app. Each `<domain>/README.md` holds that
part's constraints, known behaviours, gotchas and open questions.

Read the affected domain's README before designing a change. Update it in the
same commit when a change teaches you something non-obvious.

| Domain | Covers | Sensitive? |
|---|---|---|
| `auth/` | keychain access, login flow, session lifecycle, challenges (CAPTCHA/MFA) | **yes**: `/safe-change` |
| `hudl/` | the client: endpoints/selectors, throttling, backoff, recorded fixtures | **yes**: `/safe-change` |
| `catalog/` | listing teams, seasons, games and clips the account can see | no |
| `downloads/` | stream formats (HLS/MP4), fetch, `.part` + verify + rename, resume | partly: verification rules |
| `library/` | folder layout, naming, "already downloaded", index | **yes** for anything that moves/deletes files |
| `entry/` | CLI/UI, progress, error messages | no |

Directories are created when the first code for that domain lands. Do not
create empty ones.
