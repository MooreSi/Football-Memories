# 780: Finished analysis runs archived on the MacBook share

**Status:** Draft
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
- Age before archiving: **7 days** after finishing.
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

## Verification (filled in when shipped)
- [ ] suite green: app, gateway, worker
- [ ] no credential, cookie or token written to the repo, a log or a fixture
- [ ] nothing on Hudl modified; no existing library file deleted or overwritten
- [ ] first move reviewed by the owner: runs, bytes freed, an archived review opened
