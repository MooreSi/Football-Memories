# 004: Should the media library for Plex be on by default, and where should it live?

**Status:** open
**Raised by:** spec 220 session, 2026-11-12

## The question

Spec 220 adds a `Media library/` folder for Plex, Jellyfin and other players:
one folder per download with a readable name, a hard link to the video (no
extra space), a poster and an `.nfo` file. Should it be built automatically for
every download, and should it live inside the download folder or somewhere you
choose?

## Why it matters

If a media player is pointed at the whole download folder it will see each video
twice (the original and its media library link). Hard links only work on the
same drive and not on exFAT/FAT drives or SMB network shares (the owner's
download folder is an SMB share on a TrueNAS/Proxmox NAS as of 2026-11-12, so the
media library cannot work there; it would need a copy, or a folder made on the NAS
itself).

## Provisional default in use

Off until you turn it on with the switch on Downloaded. It lives at
`<download folder>/Media library/`; point Plex at that folder only. New files
get their details embedded inside them either way.

## What changes if the answer differs

On by default: the switch starts on. Another location: a folder picker like the
download folder's, and copies instead of links when it is on another drive.

ANSWER:
