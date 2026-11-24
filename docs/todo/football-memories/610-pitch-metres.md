# 610: Pitch positions in metres

Status: Built, not deployed (2026-11-24). Owner: "move onto pitch position in metres".

## Design

- The owner's pitch marks (spec 600) are the pitch corners: near-left = (0, 0) m, x along
  the near touchline (length), y across to the far touchline (width).
- Pitch size per run in the review (`pitch_size {length_m 15-130, width_m 10-100}`), chosen
  from youth presets (5v5 37x27, 7v7 55x37, 9v9 73x46, 11v11 youth 91x55, 11v11 100x64)
  or custom. Youth sizes vary; measuring is better.
- At each time the outline gives a 4-point homography image -> metres (`metres.ts`).
- "Pitch map" panel: live top-down positions coloured by team; heat maps per team over the
  run (12 x 8 grid); the selected person's distance covered and top speed over their
  tracked stretch (positions thinned to about 2 per second, steps over 10 m/s skipped as
  mismatches, top speed over at least 1 s).

## Result

Tests: homography corners and perspective, distance/top speed, jump rejection (checked by
mutation), heat grid; UI: size saved, live position label in metres, selected person's
running, heat map. Real 120 s run with a rough test mark and 7v7 size: the selected
player showed 43 m over 0:33, top speed 5.8 m/s (21 km/h). Accuracy depends on the
corner marks and the size; tracks are stretches, not whole matches.
