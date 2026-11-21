# 380: Estimated player minutes and presentation exploration

**Status:** Shipped
**Sensitive:** no

## What is wrong or missing today
Owner requests estimated minutes from metadata/tags, explicitly labelled, and
presentation mockups before a layout change, plus advice on Finishing.

## What changes
Estimate first-to-last involvement within each END HALF-delimited period, using
the existing touch timing convention and subtracting known keeper spells. No
extrapolation or assumed substitutions. Two distinct involvement times required.
Confirmed minutes override estimates. Explain method and uncertainty; sort agrees.
Explore compact summary, graphical bars and comparison-row layouts in conversation.

## What must NOT change
Manual corrections, goals, keeper inference, counts, account and footage behavior.
Existing tests unchanged. Mockups do not replace deployed layout.

## Non-goals
Inventing substitutions/ratings or summing clip lengths as playing time.

## Test plan
Period spans, missing evidence, keeper subtraction, invalid timing, confirmed override,
visible estimate explanation. Synthetic fixtures only; no real-account check needed.

## Verification
Frontend 645; backend 771 each SQLite/PostgreSQL; static/type/build/schema gates pass.
New behavior observed red then green. Synthetic phone browser review. No account
access, secrets, source changes or library writes. Mockups remain conversation-only.
