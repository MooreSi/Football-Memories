import { Link } from "react-router-dom";
import { opponentMap } from "../../lib/hubExtras";
import type { MatchCount } from "../../lib/records";
import { TeamBadge } from "../TeamBadge";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

/** Owner request 2026-11-13: every club played, with its crest and how often. */
export function OpponentMap({ series }: { series: MatchCount[] }) {
  const clubs = opponentMap(series);
  if (clubs.length === 0) return null;
  const most = clubs[0].matches;
  return <section aria-label="Opponent map" className="panel space-y-4 p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-lg font-semibold">Opponent map</h2>
      <span className="flex items-center gap-3 text-xs text-fg-subtle"><span>{clubs.length} {clubs.length === 1 ? "club" : "clubs"}</span>
        <Link to="/opponents" className="font-semibold text-accent hover:underline">All opponents</Link></span>
    </div>
    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clubs.map((c) => <li key={c.name} className="min-w-0">
        <Link to={c.href} aria-label={`${c.name}: ${c.matches} ${c.matches === 1 ? "match" : "matches"}, last ${day(c.last)}`}
          className="tile flex min-w-0 items-center gap-3 p-3 transition hover:border-accent/60">
          <TeamBadge name={c.name} size="sm" tone="away" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{c.name}</span>
            <span className="block text-xs text-fg-muted">{c.matches} {c.matches === 1 ? "match" : "matches"} · {c.moments.toLocaleString("en-GB")} moments</span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-linear-to-r from-[#2563eb] to-[#38bdf8]" style={{ width: `${Math.max(8, (c.matches / most) * 100)}%` }} /></span>
          </span>
        </Link>
      </li>)}
    </ul>
  </section>;
}
