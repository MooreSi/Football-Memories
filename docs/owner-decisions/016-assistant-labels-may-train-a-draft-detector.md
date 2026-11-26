# 016: May assistant-confirmed frames train the detector?

**Status:** answered 2026-11-26
**Raised by:** spec 670 status check (session after spec 760), 2026-11-26

## The question
Spec 670 (owner, 25 Nov 2026) allowed only owner-confirmed frames to train the Veo detector.
None of the 380 prepared frames had been confirmed. Should the assistant confirm the 300
training frames so a first model can be trained, with the owner confirming only the 80
held-out test frames?

## Why it matters
Training labels decide what the detector learns. Assistant labels are cheaper but not
independent, and could teach the assistant's own mistakes. The pass/fail gates must still be
judged on the owner's labels, or a model could pass on the same judgement that trained it.

## Provisional default in use
None needed: the owner answered when asked.

## What changes if the answer differs
Assistant labels are stored apart (`assistant_labels.json`, `label_origin:
assistant_reviewed`), so the owner's labelling page never loads or re-stamps them and they can
be dropped from training by leaving their sets off the command line.

ANSWER: "You confirm the 300" (owner, 2026-11-26). The assistant confirms the 300 training
frames (RCW vs CG, f7925, Norton Lindsay). The 80 held-out RMC frames stay the owner's, and
only owner-confirmed frames score the gates. A model trained this way is a draft, named as
trained on assistant labels, and is not promoted without passing those gates and the owner's
yes.
