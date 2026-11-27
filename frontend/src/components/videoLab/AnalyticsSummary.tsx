import type { AnalyticsTag, AnalyticsType } from "./analyticsTags";
import { TEAM_COLOUR } from "./LabVideo";

/* Per-team counts of the pitch analytics tags, under the 2D pitch: Hudl's team-stat rows (possession,
 * entries, restarts, chances) plus passing. Rows with nothing for either team are left out. */
const ROWS: [AnalyticsType, string][] = [
  ["pass", "Passes"], ["cross", "Crosses"], ["defensive_third_entry", "Defensive third entries"], ["midfield_third_entry", "Midfield third entries"],
  ["attacking_third_entry", "Attacking third entries"], ["penalty_area_entry", "Penalty area entries"], ["chance", "Chances"], ["on_target", "On target"],
  ["goal", "Goals"], ["throw", "Throw-ins"], ["corner", "Corners"], ["goal_kick", "Goal kicks"], ["free_kick", "Free kicks"],
];

export function AnalyticsSummary({ tags }: { tags: AnalyticsTag[] }) {
  const held = { own: 0, opponent: 0 };
  for (const t of tags) if (t.type === "possession" && t.team) held[t.team] += Math.max(0, t.end_s - t.time_s);
  const total = held.own + held.opponent;
  const count = (type: AnalyticsType, team: "own" | "opponent") => tags.filter(t => t.type === type && t.team === team).length;
  const rows: [string, number, number][] = [
    ...(total > 0 ? [["Possession %", Math.round((100 * held.own) / total), Math.round((100 * held.opponent) / total)] as [string, number, number]] : []),
    ...ROWS.map(([type, label]) => [label, count(type, "own"), count(type, "opponent")] as [string, number, number]).filter(([, a, b]) => a + b > 0),
  ];
  const stoppages = tags.filter(t => t.type === "ball_out_of_play").length;
  return <section className="space-y-2" aria-label="Pitch analytics">
    <h3 className="text-sm font-semibold">Pitch analytics</h3>
    {!rows.length ? <p className="text-xs text-fg-muted">No pitch analytics tags yet: they need the ball and players placed on the pitch.</p> : <>
      <table className="w-full text-sm" aria-label="Pitch analytics by team">
        <thead className="text-left text-xs text-fg-muted"><tr><th className="py-1 font-normal">Tag</th>
          <th className="font-normal" style={{ color: TEAM_COLOUR.own }}>Our team</th><th className="font-normal" style={{ color: TEAM_COLOUR.opponent }}>Opponent</th></tr></thead>
        <tbody>{rows.map(([label, own, opp]) => <tr key={label} className="border-t border-line"><th scope="row" className="py-1 text-left font-normal">{label}</th><td className="tabular-nums">{own}</td><td className="tabular-nums">{opp}</td></tr>)}</tbody>
      </table>
      <p className="text-xs text-fg-muted">{stoppages ? `Ball out of play ${stoppages} times. ` : ""}Estimated from tracked positions on this pitch, in addition to the match's tags: these are not Hudl or Veo tags. They are listed under Pitch analytics in the moments.</p>
    </>}
  </section>;
}
