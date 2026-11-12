import { useState } from "react";
import type { HudlMatch } from "../../api/hudl";
import { matchScore, useCorrectScore, useScoreCorrections } from "../../lib/matchScore";
import { Button } from "../ui/Button";

/** Spec 210: the match's score on its page, from the goal tags or the owner's correction,
 *  with an editor. Always says which, so a tag count never reads as an official result. */
export function MatchScoreBox({ match, club }: { match: HudlMatch; club: string | null }) {
  const corrections = useScoreCorrections();
  const save = useCorrectScore();
  const score = matchScore(match, club, corrections.data);
  const [editing, setEditing] = useState(false);
  const [ours, setOurs] = useState("");
  const [theirs, setTheirs] = useState("");
  const valid = [ours, theirs].every((v) => /^\d{1,2}$/.test(v));

  const start = () => { setOurs(String(score?.ours ?? 0)); setTheirs(String(score?.theirs ?? 0)); setEditing(true); };
  const submit = () => save.mutate({ id: match.id, score: { ours: Number(ours), theirs: Number(theirs) } }, { onSuccess: () => setEditing(false) });

  return (
    <div role="group" aria-label="Score" className="tile flex flex-wrap items-center gap-3 px-4 py-3">
      {editing ? (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (valid) submit(); }}>
          <input aria-label="Our goals" inputMode="numeric" maxLength={2} className="field w-14 text-center" value={ours} onChange={(e) => setOurs(e.target.value)} />
          <span className="text-fg-muted">–</span>
          <input aria-label="Their goals" inputMode="numeric" maxLength={2} className="field w-14 text-center" value={theirs} onChange={(e) => setTheirs(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!valid || save.isPending}>Save score</Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </form>
      ) : (
        <>
          <span className="text-2xl font-semibold tabular-nums">{score ? `${score.ours}–${score.theirs}` : "No score"}</span>
          <span className="text-xs text-fg-subtle">{score ? (score.source === "corrected" ? "Corrected" : "From tags") : "No goals tagged"}</span>
          <Button variant="ghost" onClick={start}>Correct score</Button>
          {score?.source === "corrected" && (
            <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate({ id: match.id, score: null })}>Use tagged score</Button>
          )}
        </>
      )}
      {save.isError && <p role="alert" className="w-full text-sm text-danger">{save.error.message}</p>}
    </div>
  );
}
