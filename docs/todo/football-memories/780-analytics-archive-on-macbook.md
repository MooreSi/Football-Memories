# 780: Finished analysis runs archived on the MacBook share

**Status:** Shipped 27 Nov (away case not yet seen for real)
**Sensitive:** no account surface. Moves analysis outputs (not footage library files); the
mover deletes the local copy only after a verified copy exists. Owner approves the first move.

## What is wrong or missing today
The analytics runtime on the mini (`~/Football Video Analytics/runtime`) is 73 GB, `jobs/` 43 GB
for 62 runs, and the mini has ~100 GB free. The overnight run filled the disk to 6 GB and a
window failed (OSError). The MacBook has 153 GB free.

Done 27 Nov (owner "Yes, set it up over SSH"; owner ran the sudo step): SMB share
`Football-Analytics-Store` (`~/Football-Analytics-Store` on the MacBook, owner's user only, no
guest) mounted on the mini at `/Volumes/Football-Analytics-Store` over the Thunderbolt bridge
(192.168.5.3), password in the mini's Keychain. 1 GB copy 7.4 s, checksum equal; Docker sees it.

## What changes
Owner decision: finished runs only; active jobs stay on the mini.
1. **Archive root, configured explicitly.** Worker flag `--archive-root` and gateway env
   `FM_ANALYTICS_ARCHIVE` (compose mounts it at `/analytics-archive`). A job is looked up in
   `runtime/jobs/<id>` first, then `archive/jobs/<id>`. The gateway's `safe()` guard (no
   symlinks, stays inside its root) applies unchanged to each root; no symlinks are introduced.
2. **Mover** (worker command `archive-runs`): a run is eligible when its status is terminal,
   it is older than N days, no queued/running job names it as parent, and it is not a
   pre-analysis a newer run still reads. Copy to `archive/jobs/<id>.partial`, compare SHA-256
   per file, rename, then remove the local folder. Never runs while a job is active.
3. **Away MacBook.** If the share is not mounted, archived runs answer "stored on the MacBook,
   connect it" (not 404, not an error page); analysis and new runs keep working.
4. **Remount.** A LaunchAgent remounts the share at login / on network change.

## What must NOT change
- Active jobs, queueing and both-Mac analysis read and write the mini's runtime only.
- `safe()` still refuses symlinks and paths outside a root; a test proves an archived path
  cannot escape its root.
- Reviews of an archived run still save (written in the archive, same lock file).
- No run is deleted without a byte-verified copy; footage library untouched.

## Non-goals
Moving footage, the helper's analysis tickets, benchmarks or label sets; automatic moves
under disk pressure (owner chose finished runs only, not overflow); Time Machine of the share.

## Open questions (provisional default)
- Age before archiving: **2 days** (owner, 27 Nov; was 7).
- Run the mover by hand or nightly: **by hand** until the first move is reviewed.
- Derived runs (shirt numbers) move with their source run: **yes, together**.

## Test plan
| Test | Asserts | Negative control |
|---|---|---|
| gateway lookup falls back to archive | review/result served from archive root | id in neither root is 404 |
| archive root keeps `safe()` | `..` and a symlink inside archive are 404 | same paths in runtime root also 404 |
| share missing | archived run answers "stored on the MacBook" | local run unaffected |
| mover eligibility | running / young / parent-of-active run not moved | eligible run moved |
| mover verification | corrupted copy leaves local folder and no final dir | good copy removes local |
| worker child run | shirt-number child reads an archived parent | parent missing fails clearly |

## Real-account check
None needed (no Hudl or Veo access).

## As built (27 Nov 2026), where it differs from the plan above
- Mount point is `~/Football-Analytics-Share` on the mini (always exists), not `/Volumes/...`:
  Docker refuses to start a container whose bind source is missing (checked), which would take
  the gateway down. Mounted by NetFS from Finder's Keychain entry (`mount_smbfs -N` cannot read
  it); LaunchAgent `com.footballmemories.analytics-share` retries every 60 s (worker repo
  `tools/share-mount`). Whether NetFS's soft-mount option took effect is not visible; unverified.
- The share root carries `.football-analytics-store`; the mover refuses a folder without it, so
  an empty mount point is never mistaken for the share.
- The gateway probes the archive in a thread (2 s) and remembers "away" for 15 s, so a sleeping
  MacBook cannot hang the run list.
- Video Lab shows the gateway's 409 message (other 409s too, e.g. "metadata not ready").

## Verification
- [x] suites green: gateway 534 (+7 new), worker 320 (incl. 12 new; 13th added after), app frontend 1112 (deploy tree 1103)
- [x] no credential written anywhere (password only in the mini's login Keychain)
- [x] nothing on Hudl touched; no run moved yet (dry run: 0 eligible, oldest run 3.4 days)
- [x] deployed: worker 1a1f0b5 both Macs (digest 0af697e7...), gateway archive-a2625ad, admin
      app 01e4cb5; exactly the expected containers changed; health 200
- [ ] away MacBook checked for real (sleep it, open an archived run): needs an archived run
- [x] first move (27 Nov, 2 days): 12 runs, 10.7 GB copied, 6.2 GB freed, 0 failed; archived runs open
- [x] run list kept fast: archived entries remembered on the mini (9 s -> 0.06 s)
