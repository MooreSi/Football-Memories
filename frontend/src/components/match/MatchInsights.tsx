import { Activity, Swords } from "lucide-react";
import { Link } from "react-router-dom";
import type { HudlMatch } from "../../api/hudl";
import { useHudlLibrary } from "../../api/hudl";
import { recordAgainst } from "../../lib/headToHead";
import { fixtureParts } from "../../lib/hudlFixture";
import { MOMENTUM_WEIGHTS, type Possession, momentum, possession } from "../../lib/insights";
import { useScoreCorrections } from "../../lib/matchScore";
import { OURS, THEIRS } from "../../lib/teamColours";

function minutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

/** Spec 230: time on the ball from the possession tags' lengths. */
export function PossessionBar({ value, ours, theirs, caption }: { value: Possession; ours: string; theirs: string; caption?: string }) {
  return (
    <div aria-label={`Possession: ${ours} ${value.oursPct}%, ${theirs} ${value.theirsPct}%`} role="group" className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold" style={{ color: OURS }}>{value.oursPct}%</span>
        <span className="text-xs text-fg-muted">Possession</span>
        <span className="font-semibold" style={{ color: THEIRS }}>{value.theirsPct}%</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-700" aria-hidden>
        <span style={{ width: `${value.oursPct}%`, background: OURS }} />
        <span style={{ width: `${value.theirsPct}%`, background: THEIRS }} />
      </div>
      <p className="text-[11px] text-fg-subtle">
        {caption ?? `${ours} ${minutes(value.ours)} · ${theirs} ${minutes(value.theirs)}`}{value.contested > 0 ? ` · contested ${minutes(value.contested)} not counted` : ""}
      </p>
    </div>
  );
}

/** Minute-by-minute attacking pressure; a click seeks the stream to that minute's first attacking moment. */
export function MomentumChart({ match, club, theirs, onSeek }: { match: HudlMatch; club: string | null; theirs: string; onSeek?: (time: number) => void }) {
  const { minutes: rows, halves } = momentum(match.moments ?? [], club, match.duration_s);
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.flatMap((r) => [r.ours, r.theirs]));
  const w = 6, gap = 1, h = 44, width = rows.length * (w + gap);
  return (
    <figure className="space-y-1">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>Momentum, minute by minute</span>
        <span><span style={{ color: OURS }}>▲ {club || "Us"}</span> · <span style={{ color: THEIRS }}>▼ {theirs}</span></span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg role="img" aria-label="Momentum chart" viewBox={`0 0 ${width} ${h * 2 + 8}`} className="h-32 w-full min-w-[320px]" preserveAspectRatio="none">
          <line x1={0} x2={width} y1={h + 4} y2={h + 4} stroke="rgb(255 255 255 / 0.15)" />
          {halves.map((t) => <line key={t} data-half x1={(t / 60) * (w + gap)} x2={(t / 60) * (w + gap)} y1={0} y2={h * 2 + 8} stroke="rgb(255 255 255 / 0.35)" strokeDasharray="2 2" />)}
          {rows.map((r) => {
            const x = r.minute * (w + gap);
            const up = (r.ours / max) * h, down = (r.theirs / max) * h;
            return <g key={r.minute}>
              {r.ours > 0 && <rect data-minute={r.minute} data-side="ours" x={x} y={h + 4 - up} width={w} height={up} rx={1} fill={OURS} className={onSeek ? "cursor-pointer hover:opacity-80" : undefined}
                onClick={() => r.oursAt !== null && onSeek?.(r.oursAt)}><title>{`${r.minute + 1}' ${club || "Us"}: ${r.ours}${r.goals.ours ? `, goal` : ""}`}</title></rect>}
              {r.theirs > 0 && <rect data-minute={r.minute} data-side="theirs" x={x} y={h + 4} width={w} height={down} rx={1} fill={THEIRS} className={onSeek ? "cursor-pointer hover:opacity-80" : undefined}
                onClick={() => r.theirsAt !== null && onSeek?.(r.theirsAt)}><title>{`${r.minute + 1}' ${theirs}: ${r.theirs}${r.goals.theirs ? `, goal` : ""}`}</title></rect>}
              {r.goals.ours > 0 && <circle cx={x + w / 2} cy={Math.max(3, h + 4 - up - 4)} r={2.5} fill="#fff" />}
              {r.goals.theirs > 0 && <circle cx={x + w / 2} cy={Math.min(h * 2 + 5, h + 4 + down + 4)} r={2.5} fill="#fff" />}
            </g>;
          })}
        </svg>
      </div>
      <p className="text-[11px] text-fg-subtle">
        Bars weigh each side's tags per minute: {Object.entries(MOMENTUM_WEIGHTS).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(", ")}. Dots are goals, dashed lines half-time. Click a bar to watch it.
      </p>
    </figure>
  );
}

export function HeadToHead({ match, club }: { match: HudlMatch; club: string | null }) {
  const library = useHudlLibrary();
  const corrections = useScoreCorrections();
  const opponent = fixtureParts(match.title, club)?.opponent;
  const r = opponent ? recordAgainst(library.data, club, corrections.data, opponent) : null;
  if (!r) return null;
  const others = r.meetings.filter((m) => m.id !== match.id);
  return (
    <section aria-label="Head to head" className="space-y-2">
      <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Swords size={14} aria-hidden /> Against {r.opponent}</h3>
        <Link to="/opponents" className="text-xs text-accent hover:underline">All opponents</Link></div>
      <p className="text-sm"><span className="font-semibold">{r.played} played</span>{r.scored > 0 && <> · W {r.won} D {r.drawn} L {r.lost} · goals {r.goalsFor}-{r.goalsAgainst}</>}{r.scored < r.played && <span className="text-fg-subtle"> ({r.played - r.scored} without a score)</span>}</p>
      {others.length > 0 && <ul className="space-y-1 text-xs text-fg-muted">{others.slice(0, 4).map((m) => (
        <li key={m.id}><Link className="hover:text-fg" to={`/hudl/${encodeURIComponent(m.id)}`}>{m.date ?? "Undated"} · {m.score ? `${m.score.ours}-${m.score.theirs}` : "no score"}</Link></li>
      ))}</ul>}
    </section>
  );
}

/** Match page panel: possession, momentum and the record against this opponent. */
export function MatchInsights({ match, club, onSeek }: { match: HudlMatch; club: string | null; onSeek?: (time: number) => void }) {
  const theirs = fixtureParts(match.title, club)?.opponent ?? "Opposition";
  const poss = possession(match.moments ?? [], club);
  const hasMomentum = momentum(match.moments ?? [], club).minutes.length > 0;
  return (
    <section aria-label="Match insights" className="panel space-y-5 p-5">
      <div className="flex items-center gap-2"><Activity size={16} className="text-accent" aria-hidden /><h2 className="text-lg font-semibold">Match insights</h2></div>
      {!poss && !hasMomentum && <p className="text-sm text-fg-muted">The tags for this match do not say who had the ball or attacked when.</p>}
      {poss && <PossessionBar value={poss} ours={club || "Us"} theirs={theirs} />}
      <MomentumChart match={match} club={club} theirs={theirs} onSeek={onSeek} />
      <HeadToHead match={match} club={club} />
    </section>
  );
}
