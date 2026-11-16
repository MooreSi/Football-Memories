import { Check, Copy, FileText } from "lucide-react";
import { useState } from "react";
import type { HudlMatch, HudlMoment } from "../../api/hudl";
import { codeKey, sameCode } from "../../lib/codes";
import { gameState, matchSpan } from "../../lib/gameState";
import { type GoalsSource, matchGoals, useGoalEntries } from "../../lib/goals";
import { fixtureDate, fixtureParts } from "../../lib/hudlFixture";
import { matchRecap } from "../../lib/matchRecap";
import { type Score, matchScore, useScoreCorrections } from "../../lib/matchScore";
import { usePrimaryPlayerName } from "../../lib/usePrimaryPlayerName";
import { teamSplit } from "../../lib/veoTeamSplit";
import { Button } from "../ui/Button";

type Match = GoalsSource & { id: string; title: string; moments?: HudlMoment[]; halves?: number[][]; duration_s?: number;
  score?: Score | null; source?: string; home_or_away?: string | null };

/** Spec 310: a written recap of the match, from facts the app holds, to read or copy. */
export function MatchRecap({ match, club, ours }: { match: Match; club: string | null; ours: string | null }) {
  const entries = useGoalEntries();
  const corrections = useScoreCorrections();
  const player = usePrimaryPlayerName();
  const [copied, setCopied] = useState(false);
  if (entries.isPending || corrections.isPending || !player.ready) return null;
  const isVeo = match.source === "veo";
  const parts = fixtureParts(match.title, club);
  const venue = isVeo ? (match.home_or_away === "home" ? "Home" : match.home_or_away === "away" ? "Away" : parts?.venue ?? null) : parts?.venue ?? null;
  const goals = matchGoals(match, club, entries.data?.[match.id]);
  const score = matchScore({ id: match.id, moments: match.moments, source: match.source as HudlMatch["source"], score: match.score ?? undefined }, club, corrections.data);
  const halfTime = isVeo ? (match.halves?.length ? match.halves[0][1] : null)
    : (match.moments ?? []).filter((m) => codeKey(m.category) === "END HALF").map((m) => m.time_s).sort((a, b) => a - b)[0] ?? null;
  const tagged = !isVeo && player.name ? (match.moments ?? []).filter((m) => sameCode(m.category, player.name!)).length : 0;
  const recap = matchRecap({
    ours, opponent: parts?.opponent ?? null, venue, date: fixtureDate(match.title), score,
    state: gameState(goals.goals, score, matchSpan(match)), halfTime_s: halfTime, goals,
    player: tagged && player.name ? { name: player.name, moments: tagged } : null,
    veoRows: isVeo ? teamSplit(match.team_data) : [],
  });
  const text = recap.sentences.join(" ");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
  };

  return <section aria-label="Match recap" className="panel space-y-3 p-5">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="mr-auto flex items-center gap-2 text-xl font-semibold"><FileText size={18} className="text-accent" aria-hidden /> Match recap</h2>
      <Button variant="subtle" onClick={() => void copy()}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? "Copied" : "Copy"}</Button>
    </div>
    <p className="max-w-3xl text-sm leading-relaxed">{text}</p>
    <p className="text-xs text-fg-subtle">{recap.note}</p>
  </section>;
}
