import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HudlMatch, HudlMoment } from "../api/hudl";
import { teamProfile } from "./matchProfile";

/** Spec 210: a match's score, from the coaches' goal tags or the owner's correction. */
export type Score = { ours: number; theirs: number };
export type MatchScore = Score & { source: "tags" | "corrected" };
export type Corrections = Record<string, Score>;

/** Our goals and theirs from the tags ("ASTON VILLA GOAL" vs "OPPOSITION GOAL"), paired
 *  the same way as the Match Profile. Null when no goal is tagged: the match may simply
 *  be untagged, so it is not shown as 0-0. Goal kicks are a different code. */
export function taggedScore(moments: HudlMoment[] | undefined, club: string | null): Score | null {
  if (!moments?.length) return null;
  const { axes, neutral } = teamProfile(moments, club);
  const goal = axes.find((a) => a.name === "Goal");
  if (!goal) return null;
  // "<side> GOAL" codes the profile could not place (no club name and no other paired
  // codes). One such side must be ours; reading it as 0 would be wrong. Two is ambiguous.
  // Only when our side was not found at all; otherwise such codes belong to someone else.
  let ours = goal.ours;
  if (ours === 0) {
    const unplaced = neutral.filter((k) => / GOAL$/i.test(k.name.trim()));
    if (unplaced.length > 1) return null;
    ours = unplaced[0]?.count ?? 0;
  }
  if (ours + goal.theirs === 0) return null;
  return { ours, theirs: goal.theirs };
}

export function matchScore(match: Pick<HudlMatch, "id" | "moments">, club: string | null, corrections: Corrections | undefined): MatchScore | null {
  const fixed = corrections?.[match.id];
  if (fixed) return { ...fixed, source: "corrected" };
  const tagged = taggedScore(match.moments, club);
  return tagged && { ...tagged, source: "tags" };
}

async function scoresRequest(init?: RequestInit): Promise<Corrections> {
  const res = await fetch("/api/scores", { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Could not save the score");
  return res.json();
}

export function useScoreCorrections() {
  return useQuery<Corrections>({ queryKey: ["score-corrections"], queryFn: () => scoresRequest(), retry: false, staleTime: 60_000 });
}

/** Save the owner's score for a match; null clears it (back to the tagged score). */
export function useCorrectScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, score }: { id: string; score: Score | null }) =>
      scoresRequest({ method: "PUT", body: JSON.stringify({ match_id: id, ours: score?.ours ?? null, theirs: score?.theirs ?? null }) }),
    onSuccess: (data) => qc.setQueryData(["score-corrections"], data),
  });
}
