# 070: Backup, restore and archive integrity

**Status:** Shipped 2026-11-09 (branch backup-restore)
**Brief:** section 22 (database backups, metadata/playlist export, media integrity
verification, missing-file detection, relinking, rebuilding thumbnails, restore),
acceptance criterion 17.
**Sensitive:** yes. Restore replaces every database row; it is the most
destructive operation in the app. Protections below are the point of this spec.

## Design

- A **backup** is one JSON file holding every database row (matches, tags,
  players, favourites, playlists, settings, photo paths), plus a format version
  and a schema fingerprint. It is written atomically (`.part` then rename) to
  `<archive>/FootballMemories/Backups/`, so backing up the archive folder (Time
  Machine, external drive) also backs up the index. Video files are **not**
  inside it: they already live in the archive folder.
- **Download** a backup (that is the metadata/playlist export) and **upload** one
  from another machine.
- **Restore** replaces all rows with the backup's, in **one transaction**: any
  error leaves the database exactly as it was. It requires an explicit
  `confirm: "RESTORE"`, and **first writes an automatic `pre-restore` backup** so
  a restore can itself be undone. Restore never touches video or photo files.
  Backups from older versions restore (tables and columns added since start
  empty or take their defaults); a backup from a newer version is refused with a
  clear message (changed 2026-11-09, so adding features never strands old backups).
- **Automatic backups**: one per day while the app runs (`auto-` prefix); the 14
  newest automatic backups are kept, older automatic ones are removed. Manual,
  uploaded and pre-restore backups are never removed automatically.
- **Verify files**: background check of every indexed video against its recorded
  SHA-256 (progress shown); reports ok / changed / missing.
- **Find moved files**: for each missing video, look under the archive folder for
  a file with the same size and SHA-256 and point the index at it.
- **Rebuild thumbnails**: recreate missing match thumbnails.

## What must NOT change

No video, photo or inbox file is created, changed or deleted by backup, restore,
verify or relink (relink only updates the stored path, after the hash matches).

## Test plan

| Test | Asserts |
|---|---|
| backup round trip | every table's rows identical after wiping and restoring |
| restore is atomic | a backup that fails mid-insert leaves the DB unchanged |
| restore needs confirm | without `confirm: "RESTORE"` -> 400, nothing changes |
| pre-restore backup | written before a restore; restoring it undoes the restore |
| schema mismatch | refused, nothing changes |
| new rows after restore | ids do not collide (sequences reset on Postgres) |
| names | traversal / odd names rejected |
| upload | invalid JSON or wrong format refused, nothing saved |
| retention | only `auto-` backups pruned, 14 kept |
| auto due | no auto backup within 24 h -> one is made; otherwise none |
| verify | ok, changed (byte flipped), missing |
| relink | moved file found by hash and re-pointed; a same-size different file is not |
| thumbnails | a deleted match thumbnail is recreated |
