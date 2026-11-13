import type { LucideIcon } from "lucide-react";
import { CalendarRange, Flame, Medal, Target } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { type MatchCount, playerRecords } from "../../lib/records";

const number = (n: number) => n.toLocaleString("en-GB");
const day = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const month = (key: string) => new Date(`${key}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

function Record({ label, icon: Icon, value, children }: { label: string; icon: LucideIcon; value: ReactNode; children: ReactNode }) {
  return <div role="group" aria-label={label} className="tile relative flex min-w-0 flex-col gap-2 overflow-hidden p-4">
    <div className="flex items-center justify-between gap-2 text-sm text-fg-muted"><span className="truncate">{label}</span>
      <Icon size={17} className="shrink-0 text-accent" aria-hidden /></div>
    <p className="bg-linear-to-r from-[#93c5fd] to-[#38bdf8] bg-clip-text text-3xl leading-none font-extrabold tracking-tight text-transparent tabular-nums">{value}</p>
    <div className="min-w-0 text-xs text-fg-muted">{children}</div>
  </div>;
}

/** Owner request 2026-11-13: records and streaks from the moments tagged with the
 *  player in each match. A "run" is matches in a row at or above his average. */
export function RecordsPanel({ series }: { series: MatchCount[] }) {
  const r = playerRecords(series);
  if (!r) return null;
  const href = r.best.href ?? `/matches/${r.best.match_id}`;
  return <section aria-label="Records and streaks" className="panel space-y-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">Records and streaks</h2>
      {r.personalBest && <span className="inline-flex items-center gap-1.5 rounded-full border border-pin/40 bg-pin/10 px-3 py-1 text-xs font-semibold text-pin">
        <Medal size={13} aria-hidden />New personal best</span>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Record label="Best match" icon={Medal} value={number(r.best.moments)}>
        <p className="truncate">moments vs {r.best.opponent}</p>
        <p className="flex items-center justify-between gap-2"><span>{day(r.best.match_date)}</span>
          <Link to={href} className="font-semibold text-accent hover:underline">Watch</Link></p>
      </Record>
      <Record label="Best month" icon={CalendarRange} value={number(r.bestMonth.moments)}>
        <p className="truncate">moments in {month(r.bestMonth.month)}</p>
        <p>{r.bestMonth.matches} {r.bestMonth.matches === 1 ? "match" : "matches"}</p>
      </Record>
      <Record label="Above-average run" icon={Flame} value={r.currentRun}>
        <p>{r.currentRun === 1 ? "match" : "matches"} in a row at {number(Math.round(r.average))}+ moments</p>
        <p>Longest run: {r.longestRun}</p>
      </Record>
      <Record label="Next milestone" icon={Target} value={number(r.milestone.next)}>
        <p>{number(r.milestone.remaining)} moments to go · {number(r.total)} so far</p>
        <div role="progressbar" aria-label={`Progress to ${r.milestone.next} moments`} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(r.milestone.fraction * 100)} className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-linear-to-r from-[#2563eb] to-[#38bdf8]" style={{ width: `${Math.max(3, r.milestone.fraction * 100)}%` }} />
        </div>
      </Record>
    </div>
  </section>;
}
