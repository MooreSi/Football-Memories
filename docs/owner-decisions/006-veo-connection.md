# 006: Connecting a Veo account

**Status:** open
**Raised by:** drawing-board follow-up session, 2026-11-13

## The question

The owner asked for a Veo connection in Settings > Connections, working like
Hudl (list matches, read their metadata, stream and download), tested against a
given Veo account, and for toggles that show or hide the Hudl and Veo
connections.

Before any of it is built, the owner needs to answer:

1. **Permission.** Do Veo's terms allow automated access to this account, or
   has Veo given permission (as D-012 records for Hudl)? Does Veo offer an
   official API or export for this account?
2. **Whose account.** The test account is not the Hudl account. Is it the
   owner's own, and is downloading its footage allowed?
3. **Credentials.** Should the helper save the Veo username and password in
   this Mac's Keychain and send them through Veo's normal sign-in, as D-014 does
   for Hudl?
4. **Scope.** What should be downloaded: match list and metadata only, or
   footage too?

## Why it matters

The golden rules protect the owner's accounts: no automation without
permission, credentials only in the secret store, read-only checks against
the real account. The Hudl exception (D-012, D-014) covers Hudl only. Also, the
password was sent in the chat. It is not stored in the repo, a log or a file,
but it is still in the chat, so changing it is the safe choice.

## Provisional default in use

Nothing Veo-related is built and nothing has signed in to Veo. The show/hide
toggles wait too: a Veo toggle with no Veo connection behind it would be a
control that does nothing (CLAUDE.md), and the Hudl toggle is best built
together with it.

## What changes if the answer differs

With permission (and an API, if Veo has one), a spec in `docs/todo/` covers a
Veo connector next to the Hudl helper: Keychain credentials, an ephemeral
session, a read-only listing first, then the metadata Veo exposes. A read-only
check of what this account shows is the first step. The owner signs in in the
browser pane themselves; the agent never types the password.

ANSWER:
