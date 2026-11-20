# 013: How hosted libraries get updates

**Status:** answered 2026-11-20
**Raised by:** spec 340, 2026-11-20

## The question

The owner asked for an Update section in a hosted library, with an auto-update tick box that
checks GitHub and applies new commits. Hosted libraries have no internet and no Docker access,
and the gateway's Docker filter forbids image builds, which run as root on the gateway's Mac.

## Answers (owner, 2026-11-20)

1. **Where builds run:** a separate host updater, the only thing that reaches GitHub
   (MooreSi/Football-Memories only). The Docker filter, provisioner and libraries keep their
   limits. (Rejected: letting the provisioner build.)
2. **What an update changes:** only that family's own library. Others stay on their version
   until they update. (Rejected: every library at once.)
3. **Auto-apply:** yes. Ticked libraries move to each new main commit once it builds, without
   the security pass the hosted rollout is still waiting on. The owner controls this through
   what is pushed to main.

## What follows

Anything pushed to main reaches ticked hosted libraries within about an hour. A commit that
breaks the hosted build stops at the updater (nothing is offered). A commit that builds but
misbehaves reaches ticked libraries; there is no rollback button yet.
