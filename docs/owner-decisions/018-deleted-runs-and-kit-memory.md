# 018: Should a deleted run's labels still teach kits to new runs?

**Status:** open
**Raised by:** Video Lab session, 2026-11-28 (delete analysis runs)

## The question
New runs learn kits from the saved labels of up to six related runs in the run list. When a run is
deleted its labels are kept (`kept-learning/<id>/` on the mini) but it leaves the run list, so new
runs no longer learn kits from it. Should kept labels still feed new runs?

## Why it matters
Most deleted runs are tests, whose labels may be wrong or half-done, so dropping them is usually
right. A real match deleted only to save space would lose its kit memory for later windows.

## Provisional default in use
Deleted runs no longer teach kits. Their labels are kept on disk for training and can be restored.

## What changes if the answer differs
The run list (or the kit memory) would also read `kept-learning/`, with a way to mark a deleted
run's labels as worth keeping.

ANSWER:
