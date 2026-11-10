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
