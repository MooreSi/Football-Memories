# 790 Ball training: label ball crops in Video Lab and train a ball model

Status (27 November 2026): built and tested in app, gateway (`codex/ball-training`) and worker
(`codex/ball-recovery`); not deployed. See HANDOFF.

Owner request (27 November 2026): "set up the labelling and training - add a tab in video lab
called "Training" and add images of balls and other items for manual training which will feed into
the model". Follows the ball detection trial: the detector's "ball" boxes are mostly cones, spare
balls and heads (79% static on Stoke, 98% on Eagles) and a zoom that finds more balls also finds
more of those, so pitch analytics tags did not improve. A model that tells the match ball from the
rest needs the owner's labels.

## What it does

1. **Crops.** From a finished run the worker cuts every kind of thing the detector called a ball
   (whole-frame boxes, spread over the clip, static and moving, confident and faint) into a ball
   set: `runtime/ball-sets/<id>/set.json` + `crops/NNNN.jpg` (context picture with the box
   outlined). Machine proposals only (`label_origin: machine_proposal`).
2. **Labels.** Video Lab gets two tabs, Analysis (today's page) and **Training**. Training lists
   ball sets, lets the owner add one from any finished run, and shows crops one at a time, large,
   with the choices *Match ball*, *Spare ball*, *Cone or marker*, *Person*, *Something else* and
   *Not sure* (keys 1-5, 0). Only the gateway writes `labels.json`, revisioned like review.json and
   frame labels (`label_origin: human_reviewed`); only those labels train.
3. **Training.** "Train ball model" queues a request; the worker trains a small CNN (torch, from
   scratch, no download) on the labelled crops: match ball against everything else, *Not sure*
   left out. Evaluation is split by match, never by adjacent frames: with two or more labelled
   matches one whole match is held out; with one, the result says it was not independently
   evaluated. Output `runtime/ball-models/<id>/`: weights, metrics (precision, recall, counts per
   class), the label revisions and crop hashes it used. Shown in the tab with its numbers.
4. **Feeding the model.** A trained model is not switched on by training. The worker CLI
   `ball-classify` writes a scratch copy of a run whose ball boxes carry `ball_p`; the app's ball
   path drops boxes with `ball_p < 0.5`; the pitch analytics scorer then says whether tags agree
   with Hudl/Veo better. Only a model that improves them goes into the analysis config (owner's yes).

## Boundaries

- Requests are files the gateway writes (`runtime/training-requests/<uuid>.json`, owner-bound,
  kinds `ball-set` and `ball-train`); the worker loop runs them between jobs and writes a status
  file next to each. No new public port, no new dependency, no model download.
- Same guards as frame labels: full admin, completed MFA, CSRF on writes, owner-bound sets, ids
  matched by pattern, files served only when listed in set.json.
- Footage, crops, labels and weights stay in the runtime, never in Git.
