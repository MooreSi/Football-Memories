# Goal

**Football Clip Recorder** gives the owner a reliable local copy of the
footage in their Hudl account: full games/matches and individual clips.

## What success looks like

- Log in once with the owner's Hudl account; the password lives in the OS
  keychain, never in a file.
- See the games and clips the account can access, and choose what to download.
- Downloads land in a predictable folder structure with predictable names,
  verified complete, and are never downloaded twice.
- An interrupted run resumes; a failed download says why and leaves nothing
  half-written under its final name.
- The app never changes anything in the Hudl account and never behaves in a way
  that would get the account flagged.

## Out of scope (until the owner says otherwise)

- Editing, uploading, sharing or commenting on anything in Hudl.
- Downloading content the account cannot already view in Hudl.
- Video analysis or editing. Those belong to other projects; this app's output
  is the input to them.

## Open

The stack, the library layout and the request-rate policy are open decisions:
see [../../owner-decisions/](../../owner-decisions/README.md).
