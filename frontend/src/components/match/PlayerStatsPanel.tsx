import { estimatePlayerMinutes } from "../../lib/estimatedMinutes";
import { useMemo, useState } from "react";
import { codeKey } from "../../lib/codes";
import { usePlayerMinutes } from "../../lib/playerMinutes";
import { PlayerActionProfile } from "./PlayerActionProfile";
import { PlayerMinutes } from "./PlayerMinutes";
import { formatClock } from "../../lib/format";
import type { GoalsSource, MatchGoals } from "../../lib/goals";
import { PLAYER_METRICS, playerStats, type PlayerMetric } from "../../lib/playerStats";
import { playerHeadlines, playerStandouts } from "../../lib/playerStandouts";
import { Users } from "lucide-react";
import { Card, Figure, GradientBar, OURS_FILL, StatsHeader, Standouts } from "./statsUi";

const STAT_GROUPS: { id: string; label: string; keys: PlayerMetric[] }[] = [
  { id: "attacking", label: "Attacking", keys: ["goals", "penaltiesScored", "assists", "keyPasses", "passes", "shots", "chances", "crosses", "successfulDribbles", "attacking1v1"] },
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
  const heads = playerHeadlines(players);
  const notes = playerStandouts(players);
  const busiest = [...players].sort((a, b) => b.moments.length - a.moments.length || a.name.localeCompare(b.name)).slice(0, 8);
  const peak = Math.max(1, ...busiest.map(p => p.moments.length));
  // Owner request 2026-11-27: the Match stats look (headline tiles, what stood out, gradient
  // charts) with player figures. Counts only; nothing here rates a player.
  return <section aria-label="Player stats" className="panel min-w-0 space-y-6 p-4 sm:p-5">
    <StatsHeader icon={<Users size={18} className="text-accent" aria-hidden />} title="Player stats" sub="This match in numbers, player by player">
      {players.length > 0 && <span className="text-sm text-fg-muted">{players.length} tagged players</span>}
    </StatsHeader>
    {!players.length ? <p className="rounded-xl border border-line p-4 text-sm text-fg-muted">{match.source === "veo"
      ? "Veo’s match data does not provide named player stats. Team stats are available in the Team stats tab when supplied."
      : "No tagged outfield players are available for this match. Player names and timed tags are needed for this comparison."}</p>
      : <>
        {notes.length > 0 && <Standouts notes={notes} footnote="From labels on players’ clips and saved scorers. Team-tag overlap and ties never name a leader." />}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Figure name="Players tagged" value={heads.players} note="Named on this match’s clips" />
          <Figure name="Tagged moments" value={heads.moments} note="Across every tagged player" />
          <Figure name="Goals assigned" value={heads.goals} note="Saved scorers and likely guesses" />
          <Figure name="Most involved" value={<span className="text-2xl sm:text-3xl">{heads.top?.name ?? "Shared"}</span>}
            note={heads.top ? `${heads.top.moments} tagged moments` : "No single player tagged most"} />
        </div>
        <Card title="Involvement by player" sub="Tagged moments · same scale for everyone">
          <div role="group" aria-label="Tagged moments by player" className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {busiest.map(p => <div key={p.name} role="img" aria-label={`${p.name}: ${p.moments.length} tagged moments`} className="flex min-w-0 items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm text-fg-muted" title={p.name}>{p.name}</span>
              <GradientBar value={p.moments.length} max={peak} glow={p.moments.length === peak} />
              <span className="w-8 shrink-0 text-right font-bold tabular-nums">{p.moments.length}</span>
            </div>)}
          </div>
          {players.length > busiest.length && <p className="mt-3 text-[11px] text-fg-subtle">The {busiest.length} most tagged of {players.length} players. Every player is listed below.</p>}
        </Card>
        <Card title="Outfield players" sub="Recorded contributions · counts, not ratings">
        <div className="space-y-4">
        <p className="max-w-3xl text-sm text-fg-muted">Player action counts use labels recorded on that player’s clips, including Individual action → Passing.
          Team-event overlaps are not verified actions by that player. Goals use saved scorers or marked likely guesses; unassigned goals are excluded.</p>
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
          {shown.map(p => <article key={p.name} aria-label={p.name} className="rounded-[1.25rem] border border-line bg-ink-850 p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
            <div className="grid min-w-0 gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-7">
              <div className="relative min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/[0.10] via-ink-800/60 to-ink-900/40 p-4">
                <div aria-hidden className="pointer-events-none absolute -top-12 -left-10 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ background: OURS_FILL }} />
                <div className="relative flex items-center gap-3 lg:block">
                <div className="mb-0 flex h-12 shrink-0 lg:mb-3 w-12 items-center justify-center rounded-full text-lg font-bold text-ink-950 shadow-[0_0_18px_-4px_rgb(34_211_238/0.6)]" style={{ background: OURS_FILL }} aria-hidden="true">
                  {p.name.split(/\s+/).map(word => word[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0"><h3 className="break-words text-lg font-semibold">{p.name}</h3>
                <button type="button" className="mt-2 text-xs text-accent hover:underline" onClick={() => setSelection({ name: p.name, metric: "moments" })}>
                  {p.moments.length} tagged {p.moments.length === 1 ? "moment" : "moments"}</button></div></div>
                <div className="relative mt-4"><PlayerMinutes matchId={match.id} name={p.name} estimate={estimates[codeKey(p.name)]} compact /></div>
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
        </div>
        </Card>
      </>}
  </section>;
}
