import { useMemo, useState, type RefObject } from "react";
import { clock, teamName, type Assignment, type Observation } from "./labTypes";
import { TEAM_COLOUR, colourFor, useFrameTime } from "./LabVideo";
import { PITCH_PRESETS, trackMovement, type PitchSize } from "./metres";
import { ballPath, pitchSource, playersAt, pointAt, sidelineTracks, trackPaths, trailOf } from "./livePitch";
import type { BallPoint } from "./ball";
import type { ShirtNumber } from "./shirtNumbers";
import type { Camera, PitchKeyframe } from "./pitch";

type Props = {
  rows: Observation[]; camera: Camera; marks: PitchKeyframe[]; size: PitchSize | null; at: number;
  teams: Map<number, Assignment>; selected: number | null; onSize: (size: PitchSize) => void;
  /** Team at a moment: a tracklet's kit can change when the tracker swaps people. */
  teamAt?: (track: number, time: number) => Assignment | undefined;
  onSelect?: (track: number) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
  ball?: BallPoint[]; frame?: { w: number; h: number };
  /** Show everyone: include people standing along the touchlines (parents, coaches). */
  everyone?: boolean;
  /** Shirt numbers: yours, else the automatic reading. */
  numbers?: Map<number, ShirtNumber>;
};
type View = "live" | "own" | "opponent";
const COLS = 12, ROWS = 8;
/** Drawn shape until the owner picks the real size; youth pitch sizes vary (positions are relative). */
const ASSUMED: PitchSize = PITCH_PRESETS[2].size;
const NO_REF = { current: null };

function who(info?: Assignment) {
  if (info?.role === "referee") return "Referee";
  if (info?.role === "other") return "Not a player";
  if (!info?.team) return "Unassigned person";
  return `${teamName(info.team)} ${info.role === "goalkeeper" ? "goalkeeper" : "player"}`;
}

/** Pitch lines scaled from the full-size proportions (youth pitches shrink every marking). */
function Markings({ l, w, line }: { l: number; w: number; line: number }) {
  const box = { d: l * 0.157, h: w * 0.593 }, six = { d: l * 0.052, h: w * 0.269 }, spot = l * 0.105, r = Math.min(9.15, w * 0.15), goal = w * 0.11;
  const reach = r > box.d - spot ? Math.sqrt(r * r - (box.d - spot) ** 2) : 0;
  return <g fill="none" stroke="white" strokeOpacity={0.85} strokeWidth={line}>
    <rect x={0} y={0} width={l} height={w} />
    <line x1={l / 2} y1={0} x2={l / 2} y2={w} />
    <circle cx={l / 2} cy={w / 2} r={r} />
    <circle cx={l / 2} cy={w / 2} r={line * 1.2} fill="white" />
    {[0, 1].map(end => { const x = (d: number) => end ? l - d : d, sweep = end ? 0 : 1;
      return <g key={end}>
        <rect x={Math.min(x(0), x(box.d))} y={(w - box.h) / 2} width={box.d} height={box.h} />
        <rect x={Math.min(x(0), x(six.d))} y={(w - six.h) / 2} width={six.d} height={six.h} />
        <circle cx={x(spot)} cy={w / 2} r={line * 1.2} fill="white" />
        {reach > 0 && <path d={`M ${x(box.d)} ${w / 2 - reach} A ${r} ${r} 0 0 ${sweep} ${x(box.d)} ${w / 2 + reach}`} />}
        <rect x={end ? l : -1.2} y={(w - goal) / 2} width={1.2} height={goal} strokeOpacity={0.6} />
      </g>; })}
  </g>;
}

function Marker({ x, y, r, info, selected, shirt }: { x: number; y: number; r: number; info?: Assignment; selected: boolean; shirt?: ShirtNumber }) {
  const colour = colourFor(info), ring = selected ? "white" : "#0b1220", sw = r * (selected ? 0.3 : 0.18);
  const label = shirt ? String(shirt.number) : info?.role === "goalkeeper" ? "GK" : info?.role === "referee" ? "R" : "";
  const shape = info?.role === "referee"
    ? <polygon points={`${x},${y - r * 1.15} ${x + r * 1.15},${y} ${x},${y + r * 1.15} ${x - r * 1.15},${y}`} fill={colour} stroke={ring} strokeWidth={sw} />
    : info?.team === "opponent"
      ? <polygon points={`${x},${y - r * 1.25} ${x + r * 1.15},${y + r * 0.8} ${x - r * 1.15},${y + r * 0.8}`} fill={colour} stroke={ring} strokeWidth={sw} strokeLinejoin="round" />
      : <circle cx={x} cy={y} r={info?.team ? r : r * 0.7} fill={colour} fillOpacity={info?.team ? 1 : 0.75} stroke={ring} strokeWidth={sw} />;
  return <>{selected && <circle cx={x} cy={y} r={r * 1.9} fill="white" fillOpacity={0.18} />}{shape}
    {label && <text x={x} y={y + (info?.team === "opponent" ? r * 0.25 : 0)} fontSize={r * (label.length > 1 ? 0.8 : 0.95)} fontWeight={700} textAnchor="middle" dominantBaseline="central" fill="#0b1220" fillOpacity={shirt?.source === "read" ? 0.78 : 1} pointerEvents="none">{label}</text>}</>;
}

/** Spec 610 + live 2D pitch: everyone's position moving with the video, team heat maps and the
 * selected person's running. Builds from the automatic outline as soon as a match is analysed. */
export function PitchMap({ rows, camera, marks, size, at, teams, selected, onSize, teamAt, onSelect, videoRef, ball, frame, everyone = false, numbers }: Props) {
  const [view, setView] = useState<View>("live");
  const [custom, setCustom] = useState(false);
  const now = useFrameTime(videoRef ?? NO_REF, at);
  const drawn = size ?? ASSUMED;
  const preset = size && PITCH_PRESETS.find(p => p.size.length_m === size.length_m && p.size.width_m === size.width_m);
  const source = useMemo(() => pitchSource(camera, marks, drawn), [camera, marks, drawn]);
  const allPaths = useMemo(() => source ? trackPaths(rows, source) : new Map<number, never[]>(), [rows, source]);
  const sideline = useMemo(() => everyone ? new Set<number>() : sidelineTracks(allPaths, drawn, id => teams.get(id)?.source === "you"), [allPaths, drawn, teams, everyone]);
  const paths = useMemo(() => sideline.size ? new Map([...allPaths].filter(([id]) => !sideline.has(id) || id === selected)) : allPaths, [allPaths, sideline, selected]);
  const ballTrack = useMemo(() => source && ball?.length ? ballPath(ball, source, frame?.w ?? 1920, frame?.h ?? 1080) : [], [ball, source, frame?.w, frame?.h]);
  const heat = useMemo(() => {
    if (view === "live") return null;
    const grid = Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
    for (const [track, path] of paths) {
      const t = teams.get(track);
      if (t?.team !== view || t.role === "referee" || t.role === "other") continue;
      for (const p of path) if (p.x >= 0 && p.y >= 0 && p.x < drawn.length_m && p.y < drawn.width_m) grid[Math.floor((p.y / drawn.width_m) * ROWS)][Math.floor((p.x / drawn.length_m) * COLS)] += 1;
    }
    return grid;
  }, [paths, teams, view, drawn]);
  const moved = useMemo(() => size && source?.exact && selected !== null ? trackMovement(rows.filter(r => r.track_id === selected), camera, marks, size).get(selected) : undefined, [rows, camera, marks, size, source, selected]);
  const l = drawn.length_m, w = drawn.width_m, line = Math.max(l, w) / 250, r = Math.max(l, w) / 60;
  const live = view === "live" ? playersAt(paths, now).filter(p => p.x > -2 && p.y > -2 && p.x < l + 2 && p.y < w + 2)
    .map(p => ({ ...p, info: teamAt?.(p.track_id, now) ?? teams.get(p.track_id) })).filter(p => p.info?.role !== "other")
    .sort((a, b) => Number(a.track_id === selected) - Number(b.track_id === selected)) : [];
  const trail = view === "live" && selected !== null && paths.get(selected) ? trailOf(paths.get(selected)!, now, 3) : [];
  const ballNow = view === "live" && ballTrack.length ? pointAt(ballTrack, now, 0.2) : null;
  const where = (x: number, y: number) => !size ? "on the pitch" : `at ${source?.exact ? "" : "about "}${Math.round(x)} m along, ${Math.round(y)} m in`;
  return <section className="panel space-y-3 p-3" aria-label="Pitch map">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-semibold">Pitch map</h2>
      {view === "live" && <span className="text-xs tabular-nums text-fg-muted">{clock(now)} · {live.length} on the pitch</span>}
      <label className="ml-auto flex items-center gap-2 text-sm">Pitch size
        <select aria-label="Pitch size" className="rounded-lg border border-line bg-ink-900 p-1 text-sm" value={custom || (size && !preset) ? "custom" : preset?.label ?? ""}
          onChange={e => { if (e.target.value === "custom") { setCustom(true); return; } setCustom(false); const p = PITCH_PRESETS.find(x => x.label === e.target.value); if (p) onSize(p.size); }}>
          <option value="" disabled>Choose…</option>{PITCH_PRESETS.map(p => <option key={p.label}>{p.label}</option>)}<option value="custom">Custom…</option>
        </select></label>
      {(custom || (size && !preset)) && <span className="flex items-center gap-1 text-sm">{(["length_m", "width_m"] as const).map(k => <input key={k} type="number" min={k === "length_m" ? 15 : 10} max={k === "length_m" ? 130 : 100} aria-label={k === "length_m" ? "Length in metres" : "Width in metres"} defaultValue={size?.[k] ?? ""} className="w-16 rounded border border-line bg-ink-900 p-1"
        onBlur={e => { const v = Number(e.target.value); if (v > 0) onSize({ length_m: k === "length_m" ? v : size?.length_m ?? 55, width_m: k === "width_m" ? v : size?.width_m ?? 37 }); }} />)} m</span>}
    </div>
    {!source ? <p className="text-sm text-fg-muted">The pitch cannot be placed yet: this run has no usable pitch outline. Mark the pitch corners or rebuild the complete pitch to see players on a 2D pitch.</p> : <>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Map view">{([["live", "Live positions"], ["own", "Our team heat map"], ["opponent", "Opponent heat map"]] as [View, string][]).map(([v, label]) =>
        <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md border px-2 py-1 text-xs ${view === v ? "border-accent bg-accent/15" : "border-line text-fg-muted"}`}>{label}</button>)}
        {view === "live" && <span className="ml-auto flex items-center gap-3 text-xs text-fg-muted" aria-hidden>
          <span className="flex items-center gap-1"><svg width="10" height="10"><circle cx="5" cy="5" r="4.5" fill={TEAM_COLOUR.own} /></svg>Our team</span>
          <span className="flex items-center gap-1"><svg width="10" height="10"><polygon points="5,0 10,9 0,9" fill={TEAM_COLOUR.opponent} /></svg>Opponent</span>
          <span className="flex items-center gap-1"><svg width="10" height="10"><polygon points="5,0 10,5 5,10 0,5" fill={TEAM_COLOUR.referee} /></svg>Referee</span>
        </span>}</div>
      <svg viewBox={`${-3} ${-3} ${l + 6} ${w + 6}`} className="w-full rounded-lg" role="img" aria-label={`Pitch ${l} by ${w} metres, our near touchline at the bottom`}>
        <rect x={-3} y={-3} width={l + 6} height={w + 6} fill="#166534" />
        {Array.from({ length: 10 }, (_, i) => i % 2 ? <rect key={i} x={(i * l) / 10} y={0} width={l / 10} height={w} fill="#15803d" fillOpacity={0.55} /> : null)}
        {heat && (() => { const grid = heat, max = Math.max(1, ...grid.flat()), total = Math.max(1, grid.flat().reduce((a, b) => a + b, 0));
          return grid.flatMap((row, rr) => row.map((n, c) => n ? <rect key={`${rr}-${c}`} x={(c * l) / COLS} y={w - ((rr + 1) * w) / ROWS} width={l / COLS} height={w / ROWS} fill={TEAM_COLOUR[view as "own" | "opponent"]} fillOpacity={0.15 + 0.7 * (n / max)} aria-label={`${teamName(view as "own" | "opponent")} spent ${Math.round((100 * n) / total)}% of tracked time here`} /> : null)); })()}
        <Markings l={l} w={w} line={line} />
        {trail.length > 1 && <polyline points={trail.map(p => `${p.x},${w - p.y}`).join(" ")} fill="none" stroke="white" strokeOpacity={0.7} strokeWidth={line * 1.6} strokeLinecap="round" strokeLinejoin="round" />}
        {live.map(({ track_id, x, y, info }) => { const shirt = info?.role === "referee" ? undefined : numbers?.get(track_id);
          return <g key={track_id} role="button" tabIndex={0} aria-label={`${who(info)}${shirt ? ` number ${shirt.number}${shirt.source === "read" ? " (read automatically)" : ""}` : ""} ${where(x, y)}`} className="cursor-pointer outline-none"
          onClick={() => onSelect?.(track_id)} onKeyDown={e => { if (e.key === "Enter") onSelect?.(track_id); }}>
          <Marker x={x} y={w - y} r={r} info={info} selected={track_id === selected} shirt={shirt} />
        </g>; })}
        {ballNow && <g aria-label="Ball"><circle cx={ballNow.x} cy={w - ballNow.y} r={r * 0.55} fill="white" stroke="#0b1220" strokeWidth={r * 0.15} /></g>}
      </svg>
      <p className="text-xs text-fg-muted">
        {!size && <>Size not set: drawn as a {l} x {w} m pitch until you choose the real size. </>}
        {source.exact ? "Positions come from your pitch marks and the pitch size; a misplaced corner shifts them." : "Built from the automatic pitch outline, so positions are approximate (the far half most of all). Confirm the pitch corners for exact metres."}
        {" "}Tracked people are stretches, not whole matches. {sideline.size ? "People standing along the touchlines are left off; tick Show everyone to include them. " : ""}Click a player to follow them.</p>
      {selected !== null && <p className="text-sm">{moved && moved.seconds > 0
        ? <>Selected person: <strong>{Math.round(moved.distance_m)} m covered</strong> over {clock(moved.seconds)} tracked · top speed {moved.top_speed_ms.toFixed(1)} m/s ({Math.round(moved.top_speed_ms * 3.6)} km/h)</>
        : source.exact && size ? "The selected person has no positions on the marked pitch yet." : "Distance and speed need the pitch size and marked corners."}</p>}
    </>}
  </section>;
}
