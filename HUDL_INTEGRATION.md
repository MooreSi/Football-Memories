# Hudl integration: findings and approach

Investigated 2026-11-09. Re-check before changing the approach; Hudl's terms
and products change.

## Findings

| Question (brief section 4) | Finding | Source |
|---|---|---|
| Official API for core video? | **None public.** Hudl's public developer surfaces are its data products (Wyscout Data API, StatsBomb, raw X/Y tracking via Hudl Insight). Core Hudl video integrations are partner/sales-mediated. | [apis.io Hudl listing](https://apis.io/providers/hudl/), [Hudl raw XY data API blog](https://hudl.com/blog/hudl-raw-xy-data-release-api) |
| Is automating the website (browser login + session reuse + scraping) permitted? | **No.** User Terms 3.2(8) prohibit using "any automated means, including bots, scrapers, crawlers" to access or extract data; 3.2(9) prohibits use "in any way not expressly permitted". Breach can mean account suspension. | [Hudl Terms of Service](https://www.hudl.com/terms) |
| What can a parent account do? | View game replays, filterable clips and their athlete's highlights; share highlights. Cannot see playlists, scout film or comments; cannot record or manage video. No download is mentioned. | [Hudl for Parents](https://www.hudl.com/support/club-volleyball/guides/hudl-for-parents) |
| Who can download video? | Hudl's current team-library guidance says coaches and administrators can download; athletes cannot. Actual account/product options still need checking. | [Download Video from Your Library](https://support.hudl.com/s/article/download-video-new-hudl?language=en_US) |
| Tag timestamps / player associations via supported means? | Tag filters and athlete-linked reports exist. Classic American Football supports breakdown downloads; Hudl has documented Assist XML exports for soccer/basketball. Neither proves that this owner's account has an export, or that exported data includes video-relative timestamps and player identity. | See the product-specific research below. |

## Normal sign-in and reusable URL (2026-11-09)

Use **[https://www.hudl.com/login](https://www.hudl.com/login)** as the public
entry point for each user's own credentials. A read-only public request
confirmed that it redirects to Hudl's identity authorization flow. The research
fetcher could not render the final identity page; successful sign-in was not tested.

The owner supplied an `identity.hudl.com/u/login/identifier` URL with a `state`
query parameter. That is a transaction-specific identity URL, not a reusable
app configuration. Do not copy the full URL into source, settings, logs or
fixtures, and do not simply strip its query string: start at Hudl's public
login entry point so Hudl creates a fresh authorization transaction. The value
provided in chat has deliberately not been retained here.

Opening that page signs the user into Hudl in their browser. It does not give
Football Memories an authenticated session or a supported integration. The
owner has confirmed permission for normal username/password website access;
permission from Hudl for app automation has not been established. The existing
disabled-connector policy therefore remains in force pending clarification.

## Match and tagged-moment research (2026-11-09)

These are distinct Hudl products and account capabilities, not interchangeable
endpoints or a verified procedure for the owner's account:

| Surface | Documented read-only route | Limit / missing evidence |
|---|---|---|
| Team video library | Library → select video → three-dot menu → Download. | Coach/admin access; a match page URL alone is not evidence of a downloadable file. [Source](https://support.hudl.com/s/article/download-video-new-hudl?language=en_US) |
| College/pro soccer tags | Video → open match → filter tags; navigate among filtered moments. | Guide is specifically for college/pro soccer, lacrosse and basketball. No public extraction endpoint or export schema is documented here. [Source](https://support.hudl.com/s/article/filter-tags-in-video?language=en_US) |
| Stats reports | Reports → Stats → choose games and athletes → underlined statistic opens associated video. | Documents player-linked clips and a CSV export, but does not establish that CSV contains individual event timestamps. Aggregated stats must not be imported as moments. [Source](https://support.hudl.com/s/article/stats-reports-hudl-v3?language=en_US) |
| Classic breakdown download | Select video in Manage Library; include breakdown data in the download. | Guidance is for American Football; do not assume it describes this soccer account. [Source](https://support.hudl.com/s/article/download-multiple-videos-hudl-classic?language=en_US&topic=Watch_and_Manage_Video_Classic) |
| Assist / Sportscode | Hudl documented soccer/basketball Assist breakdowns as downloadable Sportscode XML, with timelines under Manage Data. | This is an older product announcement, not proof of current account entitlement or an exact export schema. [Source](https://www.hudl.com/blog/hudl-and-sportscode-integration-improvements) |

Next evidence needed: account role/product, whether the match has Download and
Manage Data/export controls, and a scrubbed sample export. A converter needs
to establish video-relative start/end times (including half offsets), event
categories, player associations and stable event identity. Keep clips as ranges
over the full imported match (D-004); do not duplicate whole matches per player.
Actual download and tag extraction remain unimplemented and unverified against
the real account. No login, cookie capture or authenticated match request was made.

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
