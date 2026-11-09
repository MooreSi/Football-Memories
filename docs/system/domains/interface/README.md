# Interface

Design authority: [DESIGN.md](../../../design/DESIGN.md), the owner's three
references and spec 100. Existing routes are separate screens, with independent
visual canvases; do not flatten the light Player Profile into the dark dashboard.

`frontend/src/screens.css` scopes CSS variables under AppShell `data-screen`.
Keep imports above other CSS rules. The phone feed restores dark tokens to avoid
inheriting light colours. Main analysis filters use a sticky rail on desktop;
on phones they follow the video/timeline and precede the potentially long list.
Presentation must preserve existing media actions, keyboard labels, filters and
real data. Never invent player ratings or copy people from design references.
