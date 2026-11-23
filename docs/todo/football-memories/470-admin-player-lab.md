# 470: Admin player performance lab

**Status:** Shipped (verified; rollout recorded in HANDOFF)
**Sensitive:** no new account/source access; hosted role checked read-only through the existing gateway.

## What is missing
A coherent recent-performance dashboard, comparable trends and clip-backed season review. Metadata completeness varies, so ratings and success percentages cannot be invented.

## What changes
Hosted admin-only `/player/lab`, gated before loading feature/data hooks, with a header link. Reference 03 player hierarchy, shared charcoal/periwinkle theme, responsive charts and coverage detail. Recent matches, selectable metrics, last-five comparisons, personal bests, milestones, clip evidence, season review and selected-moment reel handoff. Optional manual match records supply attempts/outcomes/minutes/position, coach notes, clip-linked development goals and fair same-position teammate comparisons. Drafts stay in this browser, scoped to the signed-in admin, with validated JSON import/export and PNG season card export. No new privileged server API or cross-user data.

## What must NOT change
Existing user pages, source requests, credentials, footage, download defaults and statistical attribution. Only the admin's own library is used. Unknown values remain null; overlap never claims individual actions. The local unauthenticated app is excluded. No overall rating or tracking inference.

## Non-goals
Tracking/heatmaps/xG without spatial data, external AI services, automatic coaching judgments, and modifying source metadata. Manual lab records are experimental browser drafts, not authoritative edits to existing app statistics.

## Open questions / defaults
"All" includes the feasible recommendations plus explicit manual data entry for missing outcomes. Spatial features explain their data requirement. Require a single season and age for comparisons; only recorded, same-source samples compare. PNG excludes photos to avoid external fetches. Existing reports remain available. Local persistence is clearly labelled and portable by export.

## Test plan
| Test | Asserts | Negative control |
|---|---|---|
| Admin gate | Full signed-in hosted admin sees link/page | user, partial login, failed check and local install denied; no feature load |
| Metrics | Own actions, confirmed edits, manual paired outcomes, zero vs missing | overlap excluded from comparisons; invalid outcome pairs rejected |
| Trends | Disjoint five-game windows, source coverage | mixed/missing samples withheld; no divide by zero |
| Review | clip hrefs, best games, scoped milestones | undated/other seasons do not enter trend windows |
| Drafts | validated versioned round-trip, per-admin scope | malformed import/storage errors reported; no cross-account reuse |
| UI | selectors, evidence, notes/goals, exports, empty/error states | mobile no overflow; no synthetic production data |

## Real-account check
None needed. Offline synthetic browser/API stand-ins only.

## Verification
- Frontend 728 tests / 140 files pass, typecheck and both local/hosted builds pass.
- Backend 780 tests on SQLite and PostgreSQL; Ruff check/format, mypy and Alembic drift pass.
- Synthetic desktop 1440px and phone 375px inspected against reference 03; no document overflow.
- PNG download generated and visually inspected; no real source account accessed.
- Existing test files unchanged; no credential/session/archive changes.
- No repository CI workflow. Deployment recorded in HANDOFF/PROGRESS.
