import { Swords } from "lucide-react";
import { Link } from "react-router-dom";
import { useHudlLibrary } from "../api/hudl";
import { TeamBadge } from "../components/TeamBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { opponentRecords } from "../lib/headToHead";
import { useScoreCorrections } from "../lib/matchScore";
import { useHomeClub } from "../lib/useHomeClub";

/** Spec 230: our record against every club in the library. */
export function OpponentsPage() {
  const library = useHudlLibrary();
  const corrections = useScoreCorrections();
  const club = useHomeClub();
  if (library.isPending) return <Spinner label="Loading matches" />;
  const records = opponentRecords(library.data, club, corrections.data);
  if (!records.length) return <EmptyState icon={Swords} title="No opponents yet">Matches with "X v Y" titles appear here.</EmptyState>;
  return (
    <div className="space-y-5">
      <header><Link to="/" className="text-sm text-fg-muted">← Library</Link><p className="screen-eyebrow mt-4">HEAD TO HEAD</p><h1 className="text-3xl font-semibold">Opponents</h1>
        <p className="mt-2 text-sm text-fg-muted">Results come from goal tags or your corrected scores. Matches without a score count as played only.</p></header>
      <div className="panel overflow-x-auto p-2">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-fg-muted"><tr><th className="p-3">Opponent</th><th className="p-3 text-right">P</th><th className="p-3 text-right">W</th><th className="p-3 text-right">D</th><th className="p-3 text-right">L</th><th className="p-3 text-right">Goals</th><th className="p-3">Last meeting</th></tr></thead>
          <tbody>{records.map((r) => (
            <tr key={r.opponent} className="border-t border-line">
              <td className="p-3"><span className="flex items-center gap-2"><TeamBadge name={r.opponent} size="sm" tone="away" /><span className="font-medium">{r.opponent}</span></span></td>
              <td className="p-3 text-right tabular-nums">{r.played}</td>
              <td className="p-3 text-right tabular-nums">{r.won}</td>
              <td className="p-3 text-right tabular-nums">{r.drawn}</td>
              <td className="p-3 text-right tabular-nums">{r.lost}</td>
              <td className="p-3 text-right tabular-nums">{r.scored ? `${r.goalsFor}-${r.goalsAgainst}` : "-"}</td>
              <td className="p-3">{r.last && <Link className="text-accent hover:underline" to={`/hudl/${encodeURIComponent(r.last.id)}`}>{r.last.date ?? "Undated"}{r.last.score ? ` · ${r.last.score.ours}-${r.last.score.theirs}` : ""}</Link>}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
