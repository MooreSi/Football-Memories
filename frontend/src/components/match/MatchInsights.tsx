import { Swords } from "lucide-react";
import { Link } from "react-router-dom";
import type { HudlMatch } from "../../api/hudl";
import { hudlAgeGroups } from "../../api/hudl";
import { cohortOf, inCohort } from "../../lib/teams";
import { type Record, recordAgainst } from "../../lib/headToHead";
import { fixtureParts } from "../../lib/hudlFixture";
import { MOMENTUM_WEIGHTS, type Minute, type Possession, momentum } from "../../lib/insights";
import type { Corrections } from "../../lib/matchScore";
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
  return <MomentumBars rows={rows} halves={halves} ours={club || "Us"} theirs={theirs} onSeek={onSeek}
    caption={`Bars weigh each side's tags per minute: ${Object.entries(MOMENTUM_WEIGHTS).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(", ")}. Dots are goals, dashed lines half-time. Click a bar to watch it.`} />;
}

/** The momentum bars themselves, for Hudl tags or Veo's team events (owner request 2026-11-15). */
/** Spec 320: `label` and `now` let the same bars run under the video as the match
 *  timeline, compact, with a playhead at the current time. */
export function MomentumBars({ rows, halves, ours, theirs, caption, onSeek, label = "Momentum chart", title = "Momentum, minute by minute", now, compact = false }:
  { rows: Minute[]; halves: number[]; ours: string; theirs: string; caption?: string; onSeek?: (time: number) => void; label?: string; title?: string; now?: number; compact?: boolean }) {
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.flatMap((r) => [r.ours, r.theirs]));
  const w = 6, gap = 1, h = 44, width = rows.length * (w + gap);
  const head = now === undefined ? null : Math.min(width, (now / 60) * (w + gap));
  return (
    <figure className="space-y-1">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>{title}</span>
        <span><span style={{ color: OURS }}>▲ {ours}</span> · <span style={{ color: THEIRS }}>▼ {theirs}</span></span>
      </figcaption>
      <div className="overflow-x-auto">
        <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${h * 2 + 8}`} className={`${compact ? "h-16" : "h-32"} w-full min-w-[320px]`} preserveAspectRatio="none">
          <line x1={0} x2={width} y1={h + 4} y2={h + 4} stroke="rgb(255 255 255 / 0.15)" />
          {halves.map((t) => <line key={t} data-half x1={(t / 60) * (w + gap)} x2={(t / 60) * (w + gap)} y1={0} y2={h * 2 + 8} stroke="rgb(255 255 255 / 0.35)" strokeDasharray="2 2" />)}
          {rows.map((r) => {
            const x = r.minute * (w + gap);
            const up = (r.ours / max) * h, down = (r.theirs / max) * h;
            return <g key={r.minute}>
              {r.ours > 0 && <rect data-minute={r.minute} data-side="ours" x={x} y={h + 4 - up} width={w} height={up} rx={1} fill={OURS} className={onSeek ? "cursor-pointer hover:opacity-80" : undefined}
                onClick={() => r.oursAt !== null && onSeek?.(r.oursAt)}><title>{`${r.minute + 1}' ${ours}: ${r.ours}${r.goals.ours ? `, goal` : ""}`}</title></rect>}
              {r.theirs > 0 && <rect data-minute={r.minute} data-side="theirs" x={x} y={h + 4} width={w} height={down} rx={1} fill={THEIRS} className={onSeek ? "cursor-pointer hover:opacity-80" : undefined}
                onClick={() => r.theirsAt !== null && onSeek?.(r.theirsAt)}><title>{`${r.minute + 1}' ${theirs}: ${r.theirs}${r.goals.theirs ? `, goal` : ""}`}</title></rect>}
              {r.goals.ours > 0 && <circle cx={x + w / 2} cy={Math.max(3, h + 4 - up - 4)} r={2.5} fill="#fff" />}
              {r.goals.theirs > 0 && <circle cx={x + w / 2} cy={Math.min(h * 2 + 5, h + 4 + down + 4)} r={2.5} fill="#fff" />}
            </g>;
          })}
          {head !== null && <line data-playhead x1={head} x2={head} y1={0} y2={h * 2 + 8} stroke="#fff" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
      {caption && <p className="text-[11px] text-fg-subtle">{caption}</p>}
    </figure>
  );
}

/** The record against this Hudl match's opponent, or null when there is none. */
export function hudlHeadToHead(library: HudlMatch[] | undefined, corrections: Corrections | undefined, match: HudlMatch, club: string | null): { record: Record; allLink: string } | null {
  const opponent = fixtureParts(match.title, club)?.opponent;
  // Owner request 2026-11-13: only this team's meetings (it moves up an age group each
  // season); other age groups are different players. Undated matches use everything.
  const age = hudlAgeGroups(match)[0] ?? "";
  const team = cohortOf(age, match.season_label);
  const scope = team === null ? library : library?.filter((m) => inCohort(m, team));
  const record = opponent ? recordAgainst(scope, club, corrections, opponent) : null;
  if (!record) return null;
  return { record, allLink: team === null ? "/opponents" : `/opponents?age=${encodeURIComponent(age)}&season=${encodeURIComponent(match.season_label ?? "")}` };
}

/** The record against one opponent; also used for Veo matches (owner request 2026-11-15). */
export function HeadToHeadRecord({ record: r, current, allLink, linkTo = (id) => `/hudl/${encodeURIComponent(id)}` }:
  { record: Record; current: string; allLink?: string; linkTo?: (id: string) => string }) {
  const others = r.meetings.filter((m) => m.id !== current);
  return (
    <section aria-label="Head to head" className="space-y-2">
      <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Swords size={14} aria-hidden /> Against {r.opponent}</h3>
        {allLink && <Link to={allLink} className="text-xs text-accent hover:underline">All opponents</Link>}</div>
      <p className="text-sm"><span className="font-semibold">{r.played} played</span>{r.scored > 0 && <> · W {r.won} D {r.drawn} L {r.lost} · goals {r.goalsFor}-{r.goalsAgainst}</>}{r.scored < r.played && <span className="text-fg-subtle"> ({r.played - r.scored} without a score)</span>}</p>
      {others.length > 0 && <ul className="space-y-1 text-xs text-fg-muted">{others.slice(0, 4).map((m) => (
        <li key={m.id}><Link className="hover:text-fg" to={linkTo(m.id)}>{m.date ?? "Undated"} · {m.season} · {m.score ? `${m.score.ours}-${m.score.theirs}` : "no score"}</Link></li>
      ))}</ul>}
    </section>
  );
}
