import { Radar } from "lucide-react";
import type { Axis, Kind } from "../../lib/matchProfile";
import { radarPoints } from "../../lib/player";

// Cyan (the app's own accent) for our team, orange for the opposition: a pair that
// stays distinct for the common colour-vision deficiencies. Each fill is 22% opaque so
// the overlap reads as a third tone and neither shape hides the other; the opposition
// outline is also dashed, so the two never rely on colour alone.
import { OURS, THEIRS } from "../../lib/teamColours";
import type { Possession } from "../../lib/insights";
import { PossessionBar } from "../match/MatchInsights";
export { OURS, THEIRS };

type Shape = { side: "ours" | "theirs" | "all"; values: number[]; colour: string; dashed?: boolean };

function RadarChart({ count, shapes, label }: { count: number; shapes: Shape[]; label: string }) {
  const max = Math.max(1, ...shapes.flatMap((s) => s.values));
  const c = 120;
  const r = 88;
  const pts = (values: number[], radius = r) => radarPoints(values, max, radius, c, c);
  const ring = (f: number) => pts(Array(count).fill(max * f)).map((p) => p.join(",")).join(" ");
  const marks = pts(Array(count).fill(max), r + 16);
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={label} className="mx-auto w-full max-w-[260px]">
      {[1, 0.66, 0.33].map((f) => <polygon key={f} points={ring(f)} fill="none" stroke="rgb(255 255 255 / 0.12)" />)}
      {shapes.map((s) => (
        <polygon key={s.side} data-side={s.side} points={pts(s.values).map((p) => p.join(",")).join(" ")}
          fill={s.colour} fillOpacity={0.22} stroke={s.colour} strokeWidth={2} strokeDasharray={s.dashed ? "5 3" : undefined} strokeLinejoin="round" />
      ))}
      {marks.map(([x, y], i) => (
        <text key={i} x={x} y={y + 4} textAnchor="middle" className="fill-fg-muted text-[12px] font-semibold">{i + 1}</text>
      ))}
    </svg>
  );
}

function Swatch({ colour, dashed }: { colour: string; dashed?: boolean }) {
  return <span aria-hidden className="inline-block h-2.5 w-4 shrink-0 rounded-sm border-2" style={{ borderColor: colour, borderStyle: dashed ? "dashed" : "solid", background: `${colour}38` }} />;
}

function TeamRadar({ axes, neutral, ours, theirs }: { axes: Axis[]; neutral: Kind[]; ours: string; theirs: string }) {
  const label = `Match profile, ${ours} v ${theirs}: ${axes.map((a) => `${a.name} ${a.ours}${a.unit ?? ""} v ${a.theirs}${a.unit ?? ""}`).join(", ")}`;
  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex min-w-0 items-center gap-1.5"><Swatch colour={OURS} /><span className="truncate">{ours}</span></span>
        <span className="flex min-w-0 items-center gap-1.5"><Swatch colour={THEIRS} dashed /><span className="truncate">{theirs}</span></span>
      </div>
      {/* Each axis is scaled to the bigger side on it, so one large count (possession) does not
          squash the rest: the radar shows who had more of each situation; the key keeps real counts. */}
      <RadarChart count={axes.length} label={label} shapes={[
        { side: "theirs", values: axes.map((a) => a.theirs / Math.max(1, a.ours, a.theirs)), colour: THEIRS, dashed: true },
        { side: "ours", values: axes.map((a) => a.ours / Math.max(1, a.ours, a.theirs)), colour: OURS },
      ]} />
      <p className="mt-1 text-center text-[10px] text-fg-subtle">Each point is scaled to whichever side had more.</p>
      <ol className="mt-3 space-y-1.5" aria-hidden>
        {axes.map((a, i) => (
          <li key={a.name} title={`${a.name}: ${ours} ${a.ours}${a.unit ?? ""}, ${theirs} ${a.theirs}${a.unit ?? ""}`} className="grid grid-cols-[1.25rem_1fr_2.5rem_2.5rem] items-baseline gap-2 text-xs">
            <span className="font-semibold text-fg-muted tabular-nums">{i + 1}</span>
            <span className="truncate">{a.name}</span>
            <span className="text-right font-semibold tabular-nums" style={{ color: OURS }}>{a.ours}{a.unit}</span>
            <span className="text-right font-semibold tabular-nums" style={{ color: THEIRS }}>{a.theirs}{a.unit}</span>
          </li>
        ))}
      </ol>
      {neutral.length > 0 && (
        <p className="mt-3 text-xs text-fg-subtle">
          Neither side: {neutral.slice(0, 3).map((k) => `${k.name} ${k.count}`).join(" · ")}
        </p>
      )}
    </>
  );
}

function SingleRadar({ kinds }: { kinds: Kind[] }) {
  return (
    <>
      <RadarChart count={kinds.length} label={`Match profile: ${kinds.map((a) => `${a.name} ${a.count}`).join(", ")}`}
        shapes={[{ side: "all", values: kinds.map((k) => k.count), colour: OURS }]} />
      <ol className="mt-3 space-y-1.5" aria-hidden>
        {kinds.map((a, i) => (
          <li key={a.name} title={a.name} className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 text-xs">
            <span className="font-semibold text-accent tabular-nums">{i + 1}</span>
            <span className="truncate">{a.name}</span>
            <span className="text-fg-muted tabular-nums">{a.count}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function Bars({ kinds }: { kinds: Kind[] }) {
  const max = Math.max(1, ...kinds.map((t) => t.count));
  return (
    <ul className="space-y-3">
      {kinds.map((t) => (
        <li key={t.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
          <span className="truncate text-sm">{t.name}</span>
          <span className="text-sm text-fg-muted tabular-nums">{t.count}</span>
          <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
            <span className="block h-full rounded-full bg-gradient-to-r from-ok to-accent" style={{ width: `${(t.count / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Library left column: what happened in the match on screen (replaces "Most tagged").
 *  With codes that say whose they are, our team and the opposition get a shape each. */
export function MatchProfile({ kinds, team, scope, ours, theirs, possession, seasonPossession, links }: {
  kinds: Kind[]; team: { axes: Axis[]; neutral: Kind[] } | null; scope: string; ours: string; theirs: string;
  possession?: Possession | null; seasonPossession?: (Possession & { matches: number }) | null; links?: React.ReactNode;
}) {
  const top = kinds.slice(0, 6);
  const axes = team?.axes.slice(0, 6) ?? [];
  return (
    <section aria-label="Match profile" className="panel p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold">Match Profile</h2>
        <Radar size={16} className="text-fg-subtle" aria-hidden />
      </div>
      <p className="mb-2 text-xs text-fg-subtle">{scope}</p>
      {/* Spec 230: time on the ball from tag lengths; the radar below still counts tags. */}
      {possession && <div className="mb-4"><PossessionBar value={possession} ours={ours} theirs={theirs} /></div>}
      {team && axes.length >= 3 ? <TeamRadar axes={axes} neutral={team.neutral} ours={ours} theirs={theirs} />
        : top.length >= 3 ? <SingleRadar kinds={top} />
        : top.length > 0 ? <Bars kinds={top} />
        : <p className="text-sm text-fg-muted">No tags yet.</p>}
      {seasonPossession && <p className="mt-3 text-xs text-fg-muted">Possession across {seasonPossession.matches} {seasonPossession.matches === 1 ? "match" : "matches"} in this view: <span style={{ color: OURS }}>{seasonPossession.oursPct}%</span> v <span style={{ color: THEIRS }}>{seasonPossession.theirsPct}%</span></p>}
      {links && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">{links}</div>}
    </section>
  );
}
