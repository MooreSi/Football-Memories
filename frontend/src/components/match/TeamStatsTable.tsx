import type { TeamRow } from "../../lib/veoTeamSplit";
import { OURS_FILL, THEIRS_FILL, VersusBars } from "./statsUi";

/** Us v them, a row per stat with a split bar. Shared by Veo and Hudl match pages
 *  (owner request 2026-11-15). Owner request 2026-11-27: the Match stats gradient bars. */
export function TeamStatsTable({ rows, ours, theirs = "Opponent" }: { rows: TeamRow[]; ours: string; theirs?: string }) {
  return <table className="mx-auto w-full max-w-3xl text-sm tabular-nums">
    <thead><tr className="text-xs text-fg-subtle">
      <th scope="col" className="w-1/4 pb-2 text-left font-medium"><span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: OURS_FILL }} />{ours}</span></th>
      <th scope="col" className="pb-2 font-medium"><span className="sr-only">Stat</span></th>
      <th scope="col" className="w-1/4 pb-2 text-right font-medium"><span className="inline-flex items-center gap-1.5">{theirs}<span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: THEIRS_FILL }} /></span></th>
    </tr></thead>
    <tbody>{rows.map(r => {
      return <tr key={r.label} className="border-t border-white/5">
        <td className="py-2 text-left text-lg font-semibold">{r.own}</td>
        <td className="py-2"><div className="text-center text-fg-muted">{r.label}</div>
          <div className="mt-1.5 flex"><VersusBars ours={r.own} theirs={r.opponent} max={Math.max(1, r.own, r.opponent)} /></div></td>
        <td className="py-2 text-right text-lg font-semibold">{r.opponent}</td>
      </tr>;
    })}</tbody>
  </table>;
}
