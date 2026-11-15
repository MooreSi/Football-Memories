import type { TeamRow } from "../../lib/veoTeamSplit";

/** Us v them, a row per stat with a split bar. Shared by Veo and Hudl match pages
 *  (owner request 2026-11-15). */
export function TeamStatsTable({ rows, ours, theirs = "Opponent" }: { rows: TeamRow[]; ours: string; theirs?: string }) {
  return <table className="w-full text-sm tabular-nums">
    <thead><tr className="text-xs text-fg-subtle">
      <th scope="col" className="w-1/4 pb-2 text-left font-medium">{ours}</th>
      <th scope="col" className="pb-2 font-medium"><span className="sr-only">Stat</span></th>
      <th scope="col" className="w-1/4 pb-2 text-right font-medium">{theirs}</th>
    </tr></thead>
    <tbody>{rows.map(r => {
      const total = Math.max(1, r.own + r.opponent);
      return <tr key={r.label} className="border-t border-white/5">
        <td className="py-2 text-left text-lg font-semibold">{r.own}</td>
        <td className="py-2"><div className="text-center text-fg-muted">{r.label}</div>
          <div aria-hidden className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-white/5">
            <span className="block bg-accent" style={{ width: `${(r.own / total) * 100}%` }} />
            <span className="ml-auto block bg-fg-subtle/60" style={{ width: `${(r.opponent / total) * 100}%` }} />
          </div></td>
        <td className="py-2 text-right text-lg font-semibold">{r.opponent}</td>
      </tr>;
    })}</tbody>
  </table>;
}
