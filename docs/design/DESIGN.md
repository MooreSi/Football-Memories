# Design

Original design; not a Hudl clone. The owner's references are in
[reference/](reference/):

| File | What to take from it |
|---|---|
| `01-ai-dashboard.webp` | dark stadium mood, glass panels, large hero media, compact stat tiles |
| `02-smart-tagging-player.png` | event list beside a big player, timeline with event markers, filter chips |
| `03-player-card-profile.webp` | player card / profile header, per-player history (for Player Hub) |

## Tokens (`frontend/src/index.css`)

| Token | Value | Use |
|---|---|---|
| `ink-950 … ink-700` | #060a14 → #1a2542 | backgrounds, panels, raised surfaces |
| `line` | #233152 | borders |
| `fg / fg-muted / fg-subtle` | #e8eef8 / #93a1bd / #64728f | text hierarchy |
| `accent` | #22d3ee | electric cyan: focus, active, markers |
| `violet` | #7c5cff | secondary gradient stop, age-group badges |
| `ok / warn / danger` | green / amber / red | states only |

Rules: colours only from tokens; gradients are subtle (violet→blue, cyan→blue
on primary buttons); motion is short and disabled under
`prefers-reduced-motion`; every control does something real; visible focus
rings on everything interactive.

## Screens built

Library (grid of match cards), Match detail (player + event panel), Import,
Connections. The remaining brief screens (Dashboard, Clip Explorer, Player
Hub, Memories Timeline, Playlists/Highlights, Downloads, Notifications,
Storage, Activity) are added to the nav only when they work.
