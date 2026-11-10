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

Spec 120 places the connected Hudl catalogue directly beneath Library's heading,
using the same charcoal cards and footage imagery. The age selection persists
locally; explicit grid-row offsets keep the archive dashboard intact on desktop,
tablet and phone. `/hudl/:id` automatically prepares maximum-quality streaming
and exposes full-match, code/player and individual range download controls.
My Player offers actual tagged-code selection, including archived codes that
were previously kept only as categories. Remote code profiles link directly to
matching videos with their code filter applied.
