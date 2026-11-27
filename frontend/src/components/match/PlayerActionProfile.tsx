import { PLAYER_METRICS, type PlayerMetric, type PlayerStat } from "../../lib/playerStats";
import { OURS_FILL } from "./statsUi";

const ORDER: PlayerMetric[] = ["passes", "chances", "regains", "shots"];
const sourceLabel = { actions: "Player action", overlap: "Team-tag overlap", scorer: "Scorer assignment", none: "Not recorded" };

/** Counts share one match-wide scale; these are recorded events, never ability ratings. */
export function PlayerActionProfile({ player, keys, maximum, selected, onSelect }: {
  player: PlayerStat; keys: PlayerMetric[]; maximum: number; selected?: string; onSelect: (key: PlayerMetric) => void;
}) {
  const metrics = keys.map(key => PLAYER_METRICS.find(m => m.key === key)!);
  const positive = metrics.filter(m => (player.events[m.key]?.length ?? 0) > 0)
    .sort((a, b) => {
      const rank = (key: PlayerMetric) => ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length;
      return rank(a.key) - rank(b.key);
    });
  const zero = metrics.filter(m => player.events[m.key]?.length === 0);
  const absent = metrics.filter(m => player.events[m.key] === null);
  const button = (key: PlayerMetric, label: string, count: number) => {
    const likely = player.events[key]?.filter(c => c.confirmed === false).length ?? 0;
    return <button type="button" aria-label={`${label}: ${count}`} aria-pressed={selected === key}
      aria-description={likely ? `${likely} likely, awaiting scorer confirmation` : undefined}
      onClick={() => onSelect(key)} className={`min-w-0 rounded-md px-1 py-1 text-left hover:bg-accent/10 ${selected === key ? "bg-accent/15 text-accent" : "text-fg"}`}>
      <span className="block text-sm">{label}{count === 0 && <strong className="ml-2 tabular-nums">0</strong>}</span>
      {count > 0 && <span className="block text-xs text-fg-muted">{sourceLabel[player.sources[key]]}</span>}
      {likely > 0 && <span className="block text-xs text-warn">{likely} likely</span>}
    </button>;
  };
  return <div className="min-w-0">
    <p className="mb-3 text-xs text-fg-muted">Recorded contributions · counts, not ratings</p>
    <div className="space-y-3">
      {positive.map(m => <div key={m.key} className="grid grid-cols-[minmax(6.5rem,8.5rem)_minmax(2rem,1fr)_2rem] items-center gap-3">
        {button(m.key, m.label, player.events[m.key]!.length)}
        <div role="meter" aria-label={m.label} aria-valuenow={player.events[m.key]!.length} aria-valuemin={0} aria-valuemax={maximum}
          className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${player.events[m.key]!.length / maximum * 100}%`, background: OURS_FILL }} />
        </div>
        <button type="button" aria-label={`Review ${m.label.toLowerCase()} clips`} onClick={() => onSelect(m.key)}
          className="rounded-md py-2 text-right text-sm font-semibold tabular-nums text-fg hover:text-accent">{player.events[m.key]!.length}</button>
      </div>)}
      {!positive.length && <p className="text-sm text-fg-muted">No positive counts recorded for these stats.</p>}
    </div>
    {positive.length > 0 && <p className="mt-3 text-xs text-fg-subtle">Same count scale across players · 0–{maximum}</p>}
    {zero.length > 0 && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3">
      {zero.map(m => <div key={m.key}>{button(m.key, m.label, 0)}</div>)}
    </div>}
    <details className="mt-4 border-t border-line pt-3 text-xs text-fg-muted">
      <summary className="cursor-pointer text-accent">Sources and unrecorded stats</summary>
      <p className="mt-3">Player actions are attached to this player’s clips. Team-tag overlap links a team event to a player window; it does not identify who performed the action.
        Goals use scorer assignments; guesses are marked likely.</p>
      {absent.length > 0 && <><p className="mt-3">{absent.length} stats not recorded:</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {absent.map(m => <span key={m.key} aria-label={`${m.label}: not recorded`}>— {m.label}</span>)}
      </div></>}
    </details>
  </div>;
}
