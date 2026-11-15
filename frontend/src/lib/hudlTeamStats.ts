import type { HudlMoment } from "../api/hudl";
import { possession } from "./insights";
import { teamProfile } from "./matchProfile";
import type { TeamRow } from "./veoTeamSplit";

// Owner request 2026-11-15: a Hudl match's team stats, as on a Veo match. Each row is a
// tag stem both sides use ("ASTON VILLA CORNER" / "OPPOSITION CORNER"), counted per side.
const ROWS: [string, string][] = [
  ["GOAL", "Goals"], ["CHANCE", "Chances"], ["ON TARGET", "On target"],
  ["PENALTY AREA ENTRY", "Penalty area entries"], ["ATTACKING THIRD ENTRY", "Attacking third entries"],
  ["CROSS", "Crosses"], ["CORNER", "Corners"], ["FREE KICK", "Free kicks"], ["FOUL", "Fouls"],
  ["THROW", "Throw-ins"], ["GOAL KICK", "Goal kicks"],
];

export function hudlTeamStats(moments: HudlMoment[], club: string | null): TeamRow[] {
  const axes = new Map(teamProfile(moments, club).axes.map(a => [a.name.toUpperCase(), a]));
  const rows: TeamRow[] = [];
  const share = possession(moments, club);
  if (share) rows.push({ label: "Possession %", own: share.oursPct, opponent: share.theirsPct });
  for (const [stem, label] of ROWS) {
    const axis = axes.get(stem);
    if (axis && axis.ours + axis.theirs > 0) rows.push({ label, own: axis.ours, opponent: axis.theirs });
  }
  return rows;
}
