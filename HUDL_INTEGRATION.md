# Hudl integration: findings and approach

Investigated 2026-11-09. Re-check before changing the approach; Hudl's terms
and products change.

## Findings

| Question (brief section 4) | Finding | Source |
|---|---|---|
| Official API for core video? | **None public.** Hudl's public developer surfaces are its data products (Wyscout Data API, StatsBomb, raw X/Y tracking via Hudl Insight). Core Hudl video integrations are partner/sales-mediated. | [apis.io Hudl listing](https://apis.io/providers/hudl/), [Hudl raw XY data API blog](https://hudl.com/blog/hudl-raw-xy-data-release-api) |
| Is automating the website (browser login + session reuse + scraping) permitted? | **No.** User Terms 3.2(8) prohibit using "any automated means, including bots, scrapers, crawlers" to access or extract data; 3.2(9) prohibits use "in any way not expressly permitted". Breach can mean account suspension. | [Hudl Terms of Service](https://www.hudl.com/terms) |
| What can a parent account do? | View game replays, filterable clips and their athlete's highlights; share highlights. Cannot see playlists, scout film or comments; cannot record or manage video. No download is mentioned. | [Hudl for Parents](https://www.hudl.com/support/club-volleyball/guides/hudl-for-parents) |
| Who can download video? | Hudl support content indicates administrators and coaches. The primary article could not be fetched (it redirected), so **confirm in the account itself**. | search summary of hudl.com support pages; unverified |
| Tag timestamps / player associations via supported means? | Not found. Whether a coach-level tag or breakdown export (CSV/XML) exists could not be verified; Hudl's support site did not render to automated fetches. | unverified |

## Consequence for the app

The app **does not log in to Hudl, does not automate the Hudl website and does
not extract streams.** Doing so would breach Hudl's terms and risk the owner's
account (golden rule 3).

Instead:

| Connector | Status | Capabilities |
|---|---|---|
| `LocalImportConnector` | **Primary.** Built first. | Import match files the owner obtained through Hudl's own download/export features (or any other legitimate source), with optional tag sidecar files. |
| `MockConnector` | Tests and clearly labelled demo data only. | All capabilities, fake data. Never shown as real content. |
| `HudlConnector` | **Present but disabled.** Every capability reports `false` with the reason above. | Enabled only if Hudl provides an official API/OAuth integration or written permission for this use. |

The UI reads capabilities from `GET /api/connectors` and shows Hudl as
"Not available: Hudl does not offer a supported integration" with a link to this
file, instead of dead buttons (brief section 4).

## Recommended workflow for the owner

1. In Hudl, use Hudl's own download or export feature for each match your role
   allows (coaches/admins typically; parents may need to ask the coach).
2. Drop the file into the app's import folder (`IMPORT_ROOT`).
3. Optionally add a tag sidecar CSV with the same base name
   (`<match>.tags.csv`): see "Tag sidecar format" below. If a coach can export
   tag/breakdown data from Hudl, a converter for that format is a planned task
   once a real sample is available.
4. Import from the app's Import page.

## Tag sidecar format (v1)

UTF-8 CSV with a header row:

| column | required | example |
|---|---|---|
| `time` | yes | `15:32` or `00:15:32` or `932.5` (seconds) |
| `category` | yes | `Save` (kept exactly as written; no fixed taxonomy) |
| `players` | no | `Sam Moore; Alex Smith` (semicolon-separated) |
| `duration` | no | `6` seconds (event length; default 0) |
| `note` | no | free text |

## Open questions for the owner

See [docs/owner-decisions/002-hudl-access.md](docs/owner-decisions/002-hudl-access.md).
