import { Crosshair, Shield, Swords, Waypoints } from "lucide-react";
import type { FootballRecord } from "../../lib/playerRecords";
const number = (value: number | null, percent = false) => value === null ? "—" : `${value.toLocaleString("en-GB")}${percent ? "%" : ""}`;
const matches = (n: number) => `${n} ${n === 1 ? "match" : "matches"}`;

function StatBar({ card, maximum }: { card: FootballRecord; maximum: number }) {
  return <div role="group" aria-label={card.label} className="min-w-0 space-y-1.5 py-2">
    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-fg-muted">{card.label}</span>
      <span className="text-lg font-semibold text-fg tabular-nums">{number(card.value)}</span></div>
    {card.value !== null && <div role="meter" aria-label={card.label} aria-valuemin={0} aria-valuemax={maximum} aria-valuenow={card.value}
      className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-linear-to-r from-[#2563eb] to-[#38bdf8]" style={{ width: `${card.value / maximum * 100}%` }} />
    </div>}
    <p className="text-[11px] leading-relaxed text-fg-subtle">{card.note}</p>
  </div>;
}

export function GoalkeepingSeason({ cards, games }: { cards: FootballRecord[]; games: number }) {
  const percentage = cards.find(c => c.percent)!;
  const counts = cards.filter(c => !c.percent);
  const maximum = Math.max(1, ...counts.map(c => c.value ?? 0));
  return <section aria-label="Goalkeeping season stats" className="space-y-4 rounded-2xl border border-line bg-white/2 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><Shield size={18} className="text-accent" aria-hidden />Goalkeeping</h3>
      <span className="text-xs text-fg-subtle">{matches(games)} with keeper assignments</span></div>
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)]">
      <div className="space-y-2">{counts.map(card => <StatBar key={card.label} card={card} maximum={maximum} />)}</div>
      <div className="tile flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
            {percentage.value !== null && <circle cx="60" cy="60" r="49" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              pathLength="100" strokeDasharray={`${percentage.value} 100`} className="text-accent" />}
          </svg>
          <span className="text-3xl font-extrabold text-accent tabular-nums">{number(percentage.value, true)}</span>
          {percentage.value !== null && <span role="meter" aria-label="Save percentage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage.value} className="sr-only">{percentage.value}%</span>}
        </div>
        <p className="text-sm font-semibold">Save percentage</p><p className="max-w-64 text-[11px] text-fg-subtle">{percentage.note}</p>
      </div>
    </div>
    <p className="text-xs leading-relaxed text-fg-muted">Shots faced = saves + goals conceded in matches with recorded saves. Save percentage uses that same sample. Conceded totals may cover more matches.</p>
  </section>;
}

const GROUPS = [
  { title: "Attacking", icon: Swords, labels: ["Goals scored", "Shots on target", "Chances", "Crosses", "Attacking 1v1s", "Assists", "Key passes", "Successful dribbles"] },
  { title: "Possession & defending", icon: Waypoints, labels: ["Passes", "Regains", "Defensive 1v1s", "Tackles", "Interceptions", "Blocks", "Clearances", "Possession lost"] },
  { title: "Discipline", icon: Crosshair, labels: ["Fouls", "Fouls won", "Fouls conceded", "Offsides"] },
];
export function OutfieldSeason({ cards, games }: { cards: FootballRecord[]; games: number }) {
  const maximum = Math.max(1, ...cards.map(c => c.value ?? 0));
  return <section aria-label="Outfield season stats" className="space-y-4 rounded-2xl border border-line bg-white/2 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-semibold"><Swords size={18} className="text-accent" aria-hidden />Outfield</h3>
      <span className="text-xs text-fg-subtle">{matches(games)} with outfield involvement</span></div>
    <div className="grid gap-3 lg:grid-cols-3">
      {GROUPS.map(({ title, icon: Icon, labels }) => <div key={title} className="tile min-w-0 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-accent uppercase"><Icon size={15} aria-hidden />{title}</h4>
        {labels.map(label => cards.find(c => c.label === label)).filter((c): c is FootballRecord => !!c).map(card => <StatBar key={card.label} card={card} maximum={maximum} />)}
      </div>)}
    </div>
    <p className="text-xs leading-relaxed text-fg-muted">Bars share one count scale across outfield stats. Player actions take priority over team-tag overlap, which shows involvement. 1v1s are recorded encounters, not wins. Generic fouls are separate from fouls won or conceded; categories are not added together.</p>
  </section>;
}
