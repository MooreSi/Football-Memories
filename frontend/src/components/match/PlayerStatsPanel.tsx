import { estimatePlayerMinutes } from "../../lib/estimatedMinutes";
import { useMemo, useState } from "react";
import { codeKey } from "../../lib/codes";
import { usePlayerMinutes } from "../../lib/playerMinutes";
import { PlayerActionProfile } from "./PlayerActionProfile";
import { PlayerMinutes } from "./PlayerMinutes";
import { formatClock } from "../../lib/format";
import type { GoalsSource, MatchGoals } from "../../lib/goals";
import { PLAYER_METRICS, playerStats, type PlayerMetric } from "../../lib/playerStats";

const STAT_GROUPS: { id: string; label: string; keys: PlayerMetric[] }[] = [
  { id: "attacking", label: "Attacking", keys: ["goals", "assists", "keyPasses", "passes", "shots", "chances", "crosses", "successfulDribbles", "attacking1v1"] },
  { id: "defending", label: "Defending", keys: ["tackles", "interceptions", "blocks", "clearances", "regains", "defensive1v1"] },
  { id: "discipline", label: "Possession & discipline", keys: ["fouls", "foulsWon", "foulsConceded", "offsides", "possessionLost"] },
];

type Selection = { name: string; metric: "moments" | PlayerMetric };
export function PlayerStatsPanel({ match, club, goals, onSeek }: {
  match: GoalsSource & { id: string }; club: string | null; goals: MatchGoals; onSeek: (t: number) => void;
}) {
  const players = useMemo(() => playerStats(match, club, goals), [match, club, goals]);
  const estimates = useMemo(() => Object.fromEntries(players.map(p => [codeKey(p.name), estimatePlayerMinutes(match.moments ?? [], p.name, goals.spells)])), [players, match.moments, goals.spells]);
  const minutes = usePlayerMinutes(match.id, players.length > 0);
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [selection, setSelection] = useState<Selection | null>(null);
  const shown = players.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => {
    const count = (p: typeof a) => sort === "minutes" ? minutes.data?.[codeKey(p.name)] ?? estimates[codeKey(p.name)] ?? -1 : sort === "moments" ? p.moments.length : p.events[sort as PlayerMetric]?.length ?? -1;
    return (sort === "name" ? 0 : count(b) - count(a)) || a.name.localeCompare(b.name);
  });
  const metricKeys = STAT_GROUPS.filter(g => group === "all" || g.id === group).flatMap(g => g.keys);
  const maximum = Math.max(1, ...players.flatMap(p => metricKeys.map(key => p.events[key]?.length ?? 0)));
  const selected = players.find(p => p.name === selection?.name);
  const clips = selection?.metric === "moments" ? selected?.moments : selected?.events[selection?.metric as PlayerMetric];
  const label = selection?.metric === "moments" ? "Tagged moments" : PLAYER_METRICS.find(m => m.key === selection?.metric)?.label;
  return <section aria-label="Player stats" className="panel min-w-0 space-y-4 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold">Outfield players</h2>
      {players.length > 0 && <span className="text-sm text-fg-muted">{players.length} tagged players</span>}
    </div>
    <p className="max-w-3xl text-sm text-fg-muted">Player action counts use labels recorded on that player’s clips, including Individual action → Passing.
      Team-event overlaps are not verified actions by that player. Goals use saved scorers or marked likely guesses; unassigned goals are excluded.</p>
    {!players.length ? <p className="rounded-xl border border-line p-4 text-sm text-fg-muted">{match.source === "veo"
      ? "Veo’s match data does not provide named player stats. Team stats are available in the Team stats tab when supplied."
      : "No tagged outfield players are available for this match. Player names and timed tags are needed for this comparison."}</p>
      : <>
        <div className="flex flex-wrap gap-3">
          <label className="w-full min-w-0 text-xs text-fg-muted sm:min-w-48 sm:flex-1">Find player
            <input className="field mt-1 w-full" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Player name" /></label>
          <label className="w-full text-xs text-fg-muted sm:w-auto">Stats shown
            <select className="field mt-1 block w-full" value={group} onChange={e => setGroup(e.target.value)}>
              <option value="all">All stats</option>{STAT_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select></label>
          <label className="w-full text-xs text-fg-muted sm:w-auto">Sort players
            <select className="field mt-1 block w-full max-w-full" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="name">Name · A–Z</option><option value="moments">Most tagged moments</option><option value="minutes">Most minutes played</option>
              {PLAYER_METRICS.map(m => <option key={m.key} value={m.key}>Most {m.label.toLowerCase()}</option>)}
            </select></label>
        </div>
        <p className="text-xs text-fg-subtle">Select a count to review its clips. — means not recorded for our team; 0 means none counted.
          Tags during likely keeper spells are excluded; keepers without timed spells are excluded for the match.</p>
        <div className="space-y-2">
          {!shown.length && <p className="py-4 text-sm text-fg-muted">No players match your search.</p>}
          {shown.map(p => <article key={p.name} aria-label={p.name} className="rounded-xl border border-line bg-ink-950/30 p-3">
            <div className="grid min-w-0 gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-7">
              <div className="min-w-0 rounded-xl bg-ink-800/40 p-4">
                <div className="flex items-center gap-3 lg:block">
                <div className="mb-0 flex h-12 shrink-0 lg:mb-3 w-12 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent" aria-hidden="true">
                  {p.name.split(/\s+/).map(word => word[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0"><h3 className="break-words text-lg font-semibold">{p.name}</h3>
                <button type="button" className="mt-2 text-xs text-accent hover:underline" onClick={() => setSelection({ name: p.name, metric: "moments" })}>
                  {p.moments.length} tagged {p.moments.length === 1 ? "moment" : "moments"}</button></div></div>
                <div className="mt-4"><PlayerMinutes matchId={match.id} name={p.name} estimate={estimates[codeKey(p.name)]} compact /></div>
              </div>
              <PlayerActionProfile player={p} keys={metricKeys} maximum={maximum}
                selected={selection?.name === p.name ? selection.metric : undefined}
                onSelect={metric => setSelection({ name: p.name, metric })} />
            </div>
            {selected?.name === p.name && clips && <section aria-label="Player stat clips" className="mt-3 rounded-xl border border-accent/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{selected.name} · {label} · {clips.length}</h3>
                <button type="button" className="text-xs text-fg-muted hover:text-fg" onClick={() => setSelection(null)}>Close clips</button>
              </div>
              {selection?.metric !== "moments" && <p className="mt-2 text-xs text-fg-muted">{selected.sources[selection!.metric as PlayerMetric] === "actions"
                ? "Source: Individual action labels on this player’s clips." : selected.sources[selection!.metric as PlayerMetric] === "scorer"
                ? "Source: Goals and keepers scorer assignments; guesses are marked likely." : "Source: Team events overlapping this player’s tags; involvement, not attribution."}</p>}
              {!clips.length ? <p className="mt-3 text-sm text-fg-muted">{selection?.metric === "goals" ? "No goals assigned to this player." : "No overlapping tags for this stat."}</p>
                : <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">{clips.map(c => <li key={c.id}>
                  {c.time_s === null ? <p className="px-3 py-2 text-sm text-fg-muted">{c.category} · <span>Time not recorded</span></p>
                    : <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent/10" onClick={() => onSeek(c.time_s!)}>
                      <span className="mr-3 font-mono text-pin">{formatClock(c.time_s)}</span>{c.category}
                    </button>}</li>)}</ul>}
            </section>}
          </article>)}
        </div>
      </>}
  </section>;
}
