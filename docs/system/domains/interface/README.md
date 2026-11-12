# Interface

Design authority: [DESIGN.md](../../../design/DESIGN.md), the owner's three
references and spec 100. Existing routes are separate screens, with independent
layouts. The owner's later consistency request (D-014) gives My Player the
same charcoal palette, panel borders and periwinkle accents as the dashboard,
while retaining reference 03's card/charts/feed layout.

`frontend/src/screens.css` scopes CSS variables under AppShell `data-screen`.
Keep imports above other CSS rules. The phone feed restores dark tokens to avoid
inheriting light colours. Main analysis filters use a sticky rail on desktop;
on phones they follow the video/timeline and precede the potentially long list.
Presentation must preserve existing media actions, keyboard labels, filters and
real data. Never invent player ratings or copy people from design references.

Spec 130 supersedes the spec 120 placement: connected Hudl cards belong inside
Library's All matches panel, below offline cards, with shared search, age and
season controls. Preserve the original overview/hero/latest-match grid; no extra
full-width catalogue or row offsets. Remote cards use the same two-column card
footprint, initially 12 with Show more. Helper errors remain visible with Retry
connection; stale saved age selections clear rather than hiding every video.
`/hudl/:id` automatically prepares maximum-quality streaming and exposes
full-match, code/player and individual range download controls.
My Player offers actual tagged-code selection, including archived codes that
were previously kept only as categories. Remote code profiles link directly to
matching videos with their code filter applied.

Spec 140 makes the connected age selector follow actual Hudl team-library
memberships rather than labels in match titles. All three accessible groups are
listed; shared videos match each applicable group and display their memberships.
Keep the shared All matches filters and dashboard placement unchanged.

Spec 150 displays unverified Hudl tag sync as a separate match warning, while
stream/full-video controls continue to work. Show no fabricated moments or
player ranges; zero ranges keep moment export disabled. Completed unsynced-tag
video captures offer Import offline match without promising a populated tag file.

## Library, Clips and memories polish (spec 180)
Shared age/season preferences live in localStorage (nonsecret), notify mounted
screens and persist across app restarts. Validate a stale age only after remote
catalogue success, not against a partly loaded offline list. Library removes its
redundant Team filter and suppresses the empty offline gap when Hudl matches fit.
Hero and Clips default follow both age and season. Specific other matches remain
selectable. A missing scope prevents account-wide automatic tag indexing.

Clips keeps one visible page heading, match picker and analysis workspace.
Imported explorer, filters, queues, saved playlists and reels remain behind an
explicit Saved clips & playlists disclosure when a Hudl match is active; it is
open for imported-only mode. Desktop uses the code rail; mobile uses the compact
selector. Thumbnail poster avoids an empty black player before first Play.

Memories uses one newest-first season/month stream for Hudl/offline cards, six
moment previews with Show all, and twelve matches with Show more. Event filters,
favourites, unwatched and every moment link remain. Right feed caps previews and
links to the whole match. Charts and match-link grids must use min-w-0: ten flex
bars' intrinsic date widths previously expanded the phone grid. Radar text uses
short labels with full accessible descriptions/tooltips. Both screens checked
at 375px with document width exactly 375; desktop checked against references.

## Our side's name comes from the player first (2026-11-12)

Every fixture label and crest for our side uses `useHomeClub()`: the primary
player's "Plays for", else the newest imported team's name without its age
group, else "Home". The Library used only the imported team, so a fresh
install with Hudl matches but nothing imported showed "Home vs. Stoke City"
despite Plays for Aston Villa (owner report). Use the hook, not
`clubName(match.team_name)`, for anything that names our side.
