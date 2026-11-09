# Football Clip Recorder

Logs in to your Hudl account and downloads games/matches and clips to a local
library: verified, never downloaded twice, never overwriting what you already
have.

**Status:** project setup. No application code yet. The stack is an open
decision: [docs/owner-decisions/001-stack.md](docs/owner-decisions/001-stack.md).

## For contributors (human or AI)

Start at [CLAUDE.md](CLAUDE.md), then
[docs/system/rules/10-golden-rules.md](docs/system/rules/10-golden-rules.md).
The short version:

- Credentials and session tokens never leave the OS keychain.
- No automated test talks to Hudl; nothing ever changes anything on Hudl.
- Never delete or overwrite library files without an explicit request.
- Test first, watch it fail, never edit a test to make a change pass.

## Use

Only download content your Hudl account is entitled to view, and follow Hudl's
terms of service.
