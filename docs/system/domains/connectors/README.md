# Connectors

`GET /api/connectors` reports real capabilities. `LocalImportConnector` imports
owner-obtained files; `HudlConnector` currently reports no capabilities. Follow
[the account safety rules](../../rules/20-account-and-library-safety.md) and
the repository's `/safe-change` procedure before enabling account access.

## Hudl login and data research (2026-11-09)

Use `https://www.hudl.com/login` to begin a fresh browser login. A transaction
URL at the identity provider, with its `state` parameter, must never become a
shared configuration. A browser login does not authenticate the app backend.

Normal website permission is recorded, but the existing restriction on app
automation remains unresolved. Do not infer download/export entitlement from
the ability to watch a match. Product-specific docs distinguish team-library
downloads, college/pro tag filtering, reports, Classic breakdowns and Assist
XML. Report CSVs may be aggregate statistics rather than timed events.

Evidence, sources and missing account/export checks:
[HUDL_INTEGRATION.md](../../../../HUDL_INTEGRATION.md). Pending owner answers:
[002-hudl-access.md](../../../owner-decisions/002-hudl-access.md).
