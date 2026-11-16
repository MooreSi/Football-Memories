# Long-term preservation and safe family sharing of a child's football video archive

Researched 2026-11-16. Context: footage on a home Mac plus a TrueNAS SMB share, Plex on Proxmox (Football mounted read-only in LXC 102). Veo source recordings expire (228 of 284 already gone), so the local archive may be the only copy. UK jurisdiction. Prices are as found on the date above and many come from third-party aggregators; confirm on vendor pages before quoting to the owner.

## Preservation: backup rule, fixity, offsite, cost, cold copies, institutional guidance

### Takeaway
The institutional baseline for an individual is modest and well defined: at least two (better three) copies in physically separate places, a fixity manifest (SHA-256) checked on a schedule, a written description kept with the copies, and re-copying onto fresh media roughly every five years. NDSA Levels give a ladder the app can score itself against. On this setup the cheapest robust path is: TrueNAS (ZFS, scheduled scrubs) as primary, the Mac or a USB disk as second copy, and one encrypted offsite copy (restic or rclone crypt to Backblaze B2 or a Hetzner Storage Box, roughly USD 7/TB-month or about EUR 3/TB-month respectively), plus an app-level SHA-256 manifest so integrity can be proven independently of any one tool.

### Cited Findings
- Library of Congress "Keeping personal digital video": identify all video, decide what matters, keep the highest-quality version (web versions are "often grainy and contain less information"), give files descriptive names and tags, write a brief description of the folder structure and videos, keep at least two copies (more is better) in places as physically far apart as practical, store a copy of the description with important papers, check files at least once a year, and make new media copies every five years or as needed. It names no specific formats. — [LoC Personal Archiving: Video](https://digitalpreservation.gov/personalarchiving/video.html)
- NDSA Levels of Digital Preservation 2.0 (Oct 2019) is a four-level matrix ("Know your content" through "Sustain your content") across five areas: storage and geographic location, file fixity and data integrity, information security, metadata, and file formats. It is designed as a lightweight self-assessment, not a full strategy, and is licensed CC BY-SA 4.0 with an assessment tool and implementation guide. — [NDSA announcement](https://ndsa.org/2019/10/28/ndsa-announces-the-levels-of-digital-preservation-2.0.html)
- A Version 2.1 of the NDSA Levels was released in March 2026 with a focus on environmental sustainability; matrix at osf.io/u8m3w. — [NDSA Levels page](https://ndsa.org/publications/levels-of-digital-preservation/)
- BagIt (RFC 8493, Informational, Oct 2018, Kunze and Littman) defines a "bag" as a payload directory plus checksum manifests; a valid bag is one where every checksum in every manifest verifies. — [RFC 8493](https://rfc-editor.org/rfc/rfc8493)
- bagit-python can create bags with `--sha256` (MD5 is the default, so SHA-256 must be requested), validate with `--validate`, parallelise with a processes option, and via the API `bag.validate()` raises `BagValidationError` with ChecksumMismatch / FileMissing / UnexpectedFile details. Confirmed only on PyPI pages for 1.8.1 / 1.9b2. — [bagit on PyPI](https://pypi.org/project/bagit/)
- restic: default `restic check` verifies structure of snapshots, trees and pack files but does not read the backed-up data; `--read-data` downloads every pack file (costly on remote storage); `--read-data-subset=n/t` (e.g. 1/5..5/5) rotates through all data over several runs, and `x%` or a byte size checks a random subset. — [restic docs v0.13.1](https://restic.readthedocs.io/en/v0.13.1/045_working_with_repos.html); [restic-check man page](https://www.mankier.com/1/restic-check)
- TrueNAS Cloud Sync encryption uses rclone crypt; TrueNAS docs advise against enabling filename encryption on new tasks because existing backups can only be restored if that setting stays enabled. — [TrueNAS 24.10 Cloud Sync docs](https://www.truenas.com/docs/scale/24.10/scaletutorials/dataprotection/cloudsynctasks/)
- Backblaze B2 keeps old versions / hides deleted files rather than deleting them; lifecycle rules control removal. (Useful as accidental-deletion protection, but costs storage.) — [TrueNAS CORE 13.3 Cloud Sync docs](https://www.truenas.com/docs/core/13.3/coretutorials/tasks/creatingcloudsynctasks/)
- A third-party article claims restic powers the "TrueCloud Backup" path in TrueNAS; not confirmed in official docs found. — [hometechops](https://hometechops.com/nas/truenas-scale-first-backup-setup)
- Backblaze B2 pay-as-you-go: USD 6.95/TB-month, first 10 GB free, egress free up to 3x average stored data, then USD 0.01/GB. Sources disagree on whether API transaction fees were removed on 1 May 2026 and on when the 6.95 rate took effect. Wasabi raised PAYG to USD 7.99/TB-month from 1 July 2026; AWS S3 Standard about USD 23/TB-month. — [Upstash B2 pricing explainer, Oct 2026](https://upstash.com/blog/backblaze-b2-pricing-explained-2026); [Akave comparison](https://akave.com/en-eu/blog/wasabi-vs-backblaze-vs-akave-backup-pricing-2026); [egresscost.com](https://egresscost.com/backblaze-b2)
- Hetzner Storage Box (aggregator figures, unverified against hetzner.com): BX11 1 TB about EUR 3.20/month ex VAT (Oct 2025 listing); BX21 5 TB about EUR 10.90 ex VAT (another source EUR 12.72, likely incl. VAT); BX31 EUR 20.80; BX41 EUR 40.60; unmetered traffic. Hetzner Object Storage is a separate product (about EUR 4.99/month incl. 1 TB storage and 1 TB egress). — [whtop BX31](https://www.whtop.com/plans/hetzner.com/128271); [pricecompare](https://pricecompare.pages.dev/provider/hetzner/); [remote-backups comparison](https://remote-backups.com/comparison/hetzner-storage-box)
- M-DISC: Verbatim claims a projected lifetime of several hundred years based on ISO/IEC 16963 testing; the 1000-year claim and DoD/consumer tests are not independent certifications; there is a disputed claim that current BD M-DISCs no longer use the original Millenniata substrate. — [Wikipedia: M-DISC](https://en.wikipedia.org/wiki/M-DISC); [Verbatim product page](https://www.verbatim.com/en/m-disc/products/43825-m-disc-bd-r-25gb-4x-limited-archival-10pk); [forum post on substrate](https://lemmy.brendan.ie/comment/2125846)
- Optical drive availability is the bigger risk: Pioneer reportedly exited the optical drive market in May 2025. — [IT Pro Expert](https://itproexpert.com/the-forever-m-disc-is-dead-why-the-end-of-optical-drives-signals-a-rapid-shift-to-active-archival/)
- M-DISC BD-R 25 GB retail about USD 20 per 5-pack (about USD 4 per disc, i.e. about USD 160/TB). — [Staples.ca listing](https://www.staples.ca/products/2884277-en-verbatim-m-disc-bd-r-25gb-4x-with-branded-surface-5-pack)
- LTO-9 is 18 TB native; it suits large sequential archives, not casual home use. No reliable current cartridge/drive prices found. — [jisaku.com cold storage 2026](https://jisaku.com/posts/cold-storage-archive-2026)

### Inferences
- Map the archive to NDSA Levels and show it in the app as a "preservation health" panel: Level 1 = two copies + inventory; Level 2 = three copies, one geographically separate, SHA-256 fixity on ingest; Level 3 = scheduled fixity re-checks and logs; Level 4 = copies on different storage technologies, regular migration review. This is achievable for one family with no mandatory cloud (an offsite USD disk at a relative's house counts as the geographic copy).
- App features worth building: (1) compute SHA-256 at download time (the app already controls ingest) and store it in the DB and in a plain-text manifest per season folder (`manifest-sha256.txt`, BagIt-compatible); (2) a scheduled re-verify job that reads N GB per night and records results, alerting on mismatch or missing file; (3) a "copies" view showing which locations hold each file (TrueNAS, Mac, offsite) and the last verified date; (4) refuse to treat a recording as "safe" until at least two verified copies exist.
- ZFS scrubs on TrueNAS catch bit rot within the pool, but do not protect against deletion, ransomware, a bad SMB write, or pool loss. App-level SHA-256 is still needed because it verifies end-to-end across the Mac, SMB and offsite copies. ZFS snapshots on the footage dataset (read-only, retained for weeks) give cheap protection against accidental deletion/overwrite; the owner configures these in TrueNAS.
- restic vs rclone crypt: restic gives deduplicated, encrypted, snapshot-versioned backups with its own integrity check; rclone crypt (what TrueNAS Cloud Sync uses) gives a 1:1 encrypted mirror that is simpler to restore file by file but a mirror propagates deletions unless B2 versioning/lifecycle is kept. For an irreplaceable archive, restic (or Borg to a Hetzner box over SSH) with append-only/versioning is the safer default; keep the repository password in a password manager and on paper with the written archive description.
- Video is already compressed, so dedup and compression gains are negligible; cost is roughly linear in TB. At about 2-4 TB (estimate; confirm actual archive size), B2 is about USD 14-28/month and a Hetzner BX21 5 TB about EUR 11/month.
- M-DISC is a reasonable "cold, offline, ransomware-proof" fourth copy for a curated subset (highlights, finished season films), not for raw full-match footage, given about USD 160/TB and drive scarcity. LTO is not worth it at home scale.

### Gaps
- Official TrueNAS docs on scrub scheduling defaults were not retrieved; the "monthly scrub" recommendation found came from a third-party guide only.
- Could not fetch the NDSA 2.0/2.1 matrix text (served as image/OSF component); cell-level wording is not quoted here.
- No Digital Preservation Coalition personal-archiving page was retrieved in this session; DPC guidance is not cited.
- Official Backblaze and Hetzner price pages were not reached; figures are from aggregators and conflict in places.
- No current LTO-9 media/drive prices found.

## Formats: original codec vs transcode, MP4 vs MKV, embedded and sidecar metadata, static HTML index

### Takeaway
Keep the original downloaded files bit-for-bit as the preservation master (the LoC advice is to keep the highest-quality version, and re-encoding lossy video only loses quality). MP4 is the LoC's accepted access/proxy format; FFV1-in-Matroska is LoC-preferred for lossless preservation masters, which is overkill for already-lossy Veo/Hudl H.264 footage. Put metadata in plain sidecars (JSON plus a human-readable index) so the archive survives without the app.

### Cited Findings
- LoC upgraded FFV1 version 3 in Matroska (.mkv) from "Acceptable" to one of five "Preferred" formats for preservation and long-term access of video in Dec 2023, after adding it as acceptable in 2020; timecode (as opposed to timestamp) support is still noted as in development. — [LoC The Signal, Dec 2023](https://blogs.loc.gov/thesignal/2023/12/embracing-ffv1-matroska-container-preferred/); [LoC FDD video formats](https://loc.gov/preservation/digital/formats/fdd/video_fdd.shtml)
- The LoC Recommended Formats Statement for moving images treats MPEG-4 (.mp4) as a viewing/access format rather than a preservation master; the Statement is reviewed annually. — [LoC RFS moving image](https://loc.gov/preservation/resources/rfs/moving.html)
- LoC personal video guidance: keep the highest-quality version; descriptive names, tags for people/subjects, and a written description of the structure. — [LoC Personal Archiving: Video](https://digitalpreservation.gov/personalarchiving/video.html)

### Inferences
- Do not transcode masters. Veo/Hudl deliver lossy H.264/AAC in MP4; transcoding to FFV1 multiplies size many times without recovering anything, and transcoding to another lossy codec degrades. Remuxing MP4 to MKV is lossless but changes the file's checksum and breaks "same as source" provenance, so keep the original MP4 as master and generate any derivative (chaptered MKV, clip exports, Plex-friendly copies) as a separate, disposable file.
- Metadata strategy that survives without the app:
  - Per-match sidecar `match.json` (date, competition, opponent, score, venue, team, source platform + source ID, download date, SHA-256, tagged events with timestamps, players featured) next to the video, with a JSON Schema version field.
  - Plex/Jellyfin-readable NFO is optional but helps the existing Plex install show titles/dates; Plex uses its own agents and local-asset options, Jellyfin reads Kodi-style NFO (not verified this session; check before building).
  - Chapters for tagged events can be written into a derivative MKV or MP4 (ffmpeg FFMETADATA chapters) so any player can jump to goals; keep the master untouched.
  - A plain `README.txt` at the archive root describing folder layout, naming, sidecar fields and how to verify checksums (directly implements the LoC "write a brief description" step).
- Static HTML export: generate a self-contained `index.html` per season (and a root index) that lists matches, links to local video files with relative paths, embeds event lists with `#t=` time fragments for HTML5 video, and works opened from a USB disk with no server. This doubles as the "archive survives the app" artefact and as a family-shareable bundle.

### Gaps
- No primary source retrieved on MP4 vs MKV metadata tag interoperability (which players honour MP4 chapter atoms vs MKV chapters) or Plex/Jellyfin NFO support; these should be checked in their docs before implementation.
- Actual codec/bitrate of Veo and Hudl downloads not verified in this research (the codebase likely knows; check with ffprobe on a sample).
- No XMP-for-video guidance found.

## Expiry risk: warn before source expiry, prioritise downloads

### Takeaway
Veo deletes recordings automatically at the end of a plan-dependent retention window (12 months on Team/Club/Enterprise, 6 months on Starter) and shows proximity to expiry in its Clubhouse; there is no add-on to extend it and no confirmed bulk download. The app should compute an expected expiry date per source recording, sort the download queue by soonest expiry, and alert well before the deadline.

### Cited Findings
- Veo retention: Team, Club and Enterprise plans keep recordings 12 months, Starter 6 months, then automatic deletion; the Recordings section of the Clubhouse shows how close each recording is to expiry. (Veo support page returned HTTP 403 to direct fetch; content taken from the search index of the official page.) — [Veo support: storage policy](https://support.veo.com/hc/en-us/articles/23485386875921)
- A third-party blog says retention depends only on plan tier with no add-on to extend it, cites about 30 days' notice before deletion (not confirmed in Veo docs), and says bulk downloading is not currently possible. — [Cutsio: how long does Veo keep recordings](https://cutsio.com/blog/how-long-does-veo-keep-recordings); [Cutsio: how to download Veo recordings](https://cutsio.com/blog/how-to-download-veo-recordings)
- Veo's monthly "recording hours" allowance is separate from retention. — [Veo support: recording hours](https://support.veo.com/hc/en-us/articles/39063825710225-How-recording-hours-work-in-your-Veo-plan)

### Inferences
- Implement an "at risk" queue: expected_expiry = recording_date + plan_retention (configurable per club/team since the owner's plan may differ by club), refined by any expiry date the source shows. Sort undownloaded recordings by expected_expiry ascending; badge at 60/30/7 days; a dashboard count "N recordings expire in the next 30 days, none downloaded".
- Treat "downloaded" as "downloaded and checksummed and present in at least two locations" so the warning does not clear on a partial or single-copy download.
- Record expired-before-download items explicitly (status `expired_at_source`) so the gap is visible and the owner can ask the club/coach whether anyone else holds a copy.
- yt-dlp's download-archive pattern (a text file of already-fetched IDs so reruns skip them) and Tube Archivist/Immich style "already have it" dedup are the common model; the app's DB already plays this role. (Pattern knowledge, not sourced this session.)

### Gaps
- Hudl's retention/expiry policy was not researched or found in this session.
- Could not verify Veo's deletion-notice behaviour (30-day email) from Veo itself.
- No sourced description of how yt-dlp archives, Tube Archivist or Immich handle upstream expiry specifically; none of them appear to have source-expiry warnings (unverified).

## Sharing with family privately

### Takeaway
Plex is already running and is the easiest client for relatives, but since late 2025 remote streaming of personal media requires Plex Pass or Remote Watch Pass, and managed-user behaviour has quirks. Jellyfin plus Tailscale avoids subscriptions and keeps everything private but needs each relative to run Tailscale. Immich-style public links with expiry and password are convenient for one-off clips but the URL is the credential and Immich had a password-in-URL CVE fixed in 2.6.0. For a local-first app, the safest default is per-clip share links that expire, are served only over Tailscale or a hardened reverse proxy, and never expose the full library.

### Cited Findings
- Plex now restricts remote streaming of personal media to paid plans (Plex Pass or Remote Watch Pass); local streaming unaffected. Enforcement began late Nov 2025. — [Privacy Guides, 26 Nov 2025](https://www.privacyguides.org/news/2025/11/26/plex-begins-enforcing-new-restrictions-on-remote-streaming-this-week/)
- A Plex forum report says managed users lose access ("Server offline"/"No access") when Remote Access is disabled, even on the LAN, while the admin still connects. Single user report. — [Plex forums](https://forums.plex.tv/t/managed-users-lose-access-when-remote-access-is-disabled-even-on-lan/937983)
- Jellyfin is free/open source and commonly reached remotely via Tailscale; trade-off is each device needs the Tailscale client; some users with non-technical family found Tailscale unworkable and used a reverse proxy instead. — [Lemmy thread](https://lemmy.klein.ruhr/post/251444/995749); [Lemmy thread 2](https://lemmy.manganiello.tech/post/166411/21268); [ZimaSpace comparison (vendor)](https://shop.zimaspace.com/blogs/product-comparisons/plex-vs-jellyfin-family-clients-remote-access)
- Immich public shared links can have an expiration date, password protection, and allowed actions (e.g. download/upload); a link works without an account. — [Immich docs: sharing](https://docs.immich.app/features/sharing/)
- CVE-2026-25118: Immich before 2.6.0 transmitted the shared-album password in URL query parameters during authentication; fixed in 2.6.0. — [NVD CVE-2026-25118](https://nvd.nist.gov/vuln/detail/cve-2026-25118)

### Inferences
- What to build into the app's share flow:
  - Share unit is a clip or a curated playlist, never the whole library or a full match by default (full matches show many other children).
  - Links are random high-entropy tokens, expire by default (e.g. 30 days), can be revoked, and record view counts. Passwords, if used, go in a POST body, never a URL (lesson from the Immich CVE).
  - Download off by default; streaming via the app's own endpoint with Range support.
  - Reachability: default to Tailscale (tailnet sharing or Tailscale Funnel only if the owner opts in); no port-forwarding by default.
  - Plex remains the "sofa" experience for household and Plex Pass family; the app should not try to replace it, just keep Plex's library folder read-only and well named.
- A password-protected static export (the HTML index above, plus clips, zipped or on a USB stick) is the lowest-risk way to give grandparents a season without any server exposure.

### Gaps
- Did not retrieve Plex docs on Plex Home / managed user library restrictions or current Plex Pass UK pricing.
- Did not retrieve Jellyfin docs on per-user library access/parental controls.
- Did not retrieve Tailscale docs on node sharing / Funnel limits.

## Safeguarding: FA, CPSU, UK GDPR and the share/export flow

### Takeaway
UK law and FA/CPSU guidance support parents filming their own child's football for personal use; private sharing with friends and family is likely outside UK GDPR, but public posting (unlimited audience) brings data protection obligations, especially for other children. The FA's main risk concerns are identification (name + image + club), re-sharing of privately shared images, and children subject to court/care restrictions. The app should make private, expiring, clip-level sharing the default, strip identifying detail, and require a deliberate, consent-checked step (with blurring of other children) before anything public.

### Cited Findings
- FA Guidance Notes 8.3 "Photographing and Filming Children", version 1.3, published 2025: The FA supports appropriate photography/filming and recognises documenting a child's progress through the season and using film as a coaching tool. — [FA 8.3 v1.3 (PDF)](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/safeguarding/21-10-2025/83-photography-and-filming-children.ashx)
- FA 8.3 risks listed include: footage that is ambiguous and can be used out of context; footage easily copied and edited (including to create abuse imagery); footage shared privately online being re-shared into the public domain. — [FA 8.3 v1.3](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/safeguarding/21-10-2025/83-photography-and-filming-children.ashx)
- FA 8.3 on identification: an image accompanied by significant personal information (e.g. full name, address) makes a child more identifiable and "can lead, and has led" to children being located, contacted or groomed; even the school, club or favourite team can be used to groom. Heightened risk for children in local authority care or adopted, where there are court restrictions on contact with a parent, or child witnesses. — [FA 8.3 v1.3](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/safeguarding/21-10-2025/83-photography-and-filming-children.ashx)
- FA 8.3 tells clubs to get written parental consent before using a player's image/footage in the public domain (club website, Facebook, newspaper), to protect children under care proceedings from being placed in the public domain (via the FA Club Annual Membership Information and Consent Form, Guidance Notes 8.2), and to ensure those featured are appropriately dressed. It notes digital editing tools can blur non-consented individuals before hosting on official league/club sites. — [FA 8.3 v1.3](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/safeguarding/21-10-2025/83-photography-and-filming-children.ashx)
- FA 8.3: photography banned in toilets, changing areas, first-aid areas; organisers should give photographers a way to identify children who must not be filmed (badge, sticker, wristband or checking with the team manager). Concerns go to the County FA Designated Safeguarding Officer or Safeguarding@TheFA.com. — [FA 8.3 v1.3](https://www.thefa.com/-/media/thefacom-new/files/rules-and-regulations/safeguarding/21-10-2025/83-photography-and-filming-children.ashx); [FA search summary](https://www.thefa.com/-/media/cfa/lincolnshirefa/files/safeguarding/2020/8-3-photographing-and-filming-children-colour-version-(1).ashx?la=en)
- CPSU (NSPCC) guidance: organisations should have a photography and filming policy (templates provided) and consent forms; anyone filming should be able to identify which children must not be photographed; some organisations ban only specific areas rather than all photography. Page last updated 25 Nov 2025. — [CPSU: photography and filming](https://thecpsu.org.uk/resource-library/feature-boxes/key-info-photography); [CPSU: photography by parents and spectators](https://thecpsu.org.uk/help-advice/topics/photography); [CPSU consent form template](https://thecpsu.org.uk/resource-library/2017/photography-and-filming-consent-form)
- ICO: data protection law does not stop parents photographing/filming their children for personal use. Posting to a private account viewable only by friends/family is likely "purely personal or household activity" outside data protection law. Posting to a public account with unlimited audience likely goes beyond personal use, so obligations apply; not automatically prohibited, but the poster must consider whether those pictured would reasonably expect it and take particular care with children. People can ask for removal (allow one month) then complain to the ICO. — [ICO: photos at school](https://ico.org.uk/for-the-public/schools/photos/)
- ICO exemptions guidance: purely personal or household processing with no professional/commercial connection is outside UK GDPR scope. — [ICO exemptions](https://ico.org.uk/for-organisations/guide-to-the-general-data-protection-regulation-gdpr/exemptions)

### Inferences
- Share/export flow requirements the app can build:
  1. Audience picker with consequences spelled out: "Just me / household", "Named family (private link)", "Public". Public triggers the extra steps below; the ICO line is between private family audiences and an unlimited audience.
  2. Strip identifiers by default on anything leaving the app: no child surname, no club name/badge in titles or filenames, no venue, no date-location combo; strip container metadata (GPS, device, titles) on exported clips.
  3. Teammate check: for public shares, prompt "Does this clip clearly show other children?" and offer face/region blur (ffmpeg boxblur on tracked regions, or a manual blur box) before export; record that the owner confirmed consent or blurred.
  4. Restricted-children list: let the owner mark players (by shirt number/name in tags) who must never appear in shared output (matches the FA/CPSU wristband concept); warn if a clip's tags include them.
  5. Private links expire and are revocable (limits the FA's re-sharing risk), with a visible note to recipients not to re-post.
  6. Never auto-post to social media; no "share to Facebook" button.
  7. Content-safety guard: the app only ingests match footage from Veo/Hudl, so changing-room risk is low, but any clip-export tool should not allow frame-stepping exports of ambiguous moments to be bulk-shared without review (proportionate, low-priority).
- Club-held Veo footage is the club's processing; the owner's personal archive of it, used privately, sits in household use, but publishing it is a different matter and the club's own photography policy may apply. Worth an owner-decision entry.

### Gaps
- Did not read FA Guidance Notes 8.2 (consent form) or FA "Section 6: Safeguarding in the Digital World".
- No authoritative source on whether a parent needs other parents' consent to share teammate-containing clips in a closed family group (ICO page implies not, for household use).
- Copyright/ownership of Veo/Hudl footage (club vs Veo vs filmer) not researched.
- Online Safety Act implications for a self-hosted share page not researched (likely not applicable to a private family tool; unverified).

## Print and physical keepsakes

### Takeaway
UK photo-book services (notably CEWE) support video QR codes in printed books and yearbooks, but they host the video themselves (CEWE: up to 30 years) or require a public link (smartphoto: YouTube/Vimeo). For an archive of a child, the safer pattern is a printed season yearbook whose QR codes point to the owner's own expiring share links or to files on an accompanying USB stick/M-DISC, accepting that self-hosted links will rot unless the owner maintains them.

### Cited Findings
- CEWE UK photo yearbooks can include videos via a unique QR code; CEWE stores the videos for up to 30 years; the QR code must not be deleted after ordering for playback to work. — [CEWE photo yearbooks](https://www.cewe.co.uk/shop-by-theme/photo-yearbooks.html); [CEWE: adding video](https://cewe.co.uk/tutorials/photo-books/adding-video.html)
- Smartphoto's QR code feature requires the video to be publicly available online (e.g. YouTube or Vimeo) (Swiss site guidance). — [smartphoto](https://www.smartphoto.ch/en/photo-books/photobooks-all)
- Myalbum photo books include videos via QR codes. — [Myalbum support](https://support.myalbum.com/hc/en-us/articles/213487645-Video-in-Photo-Books)

### Inferences
- App feature: "Season yearbook" export producing a print-ready PDF (A4/square) with match results, stills from tagged events, and QR codes. QR target options: (a) the owner's own short-lived share link (private, but will expire); (b) a stable path on the family's tailnet (private, needs Tailscale); (c) a relative path into a companion USB/M-DISC (permanent, offline). Default to (c) plus printed match/clip IDs, so the book still maps to files decades later.
- Uploading child footage to CEWE/YouTube for QR hosting moves it to third parties and (for public YouTube) into the public domain; the safeguarding steps above apply, and unlisted links can still be re-shared.
- Stills chosen for print should follow the FA "appropriately dressed" and identification guidance (no full name plus club plus location on the same page if the book may circulate beyond family).

### Gaps
- No UK grassroots-football-specific yearbook service found; no pricing gathered for CEWE yearbooks.
- No data on long-term reliability of vendor-hosted QR video (beyond CEWE's own 30-year claim).
