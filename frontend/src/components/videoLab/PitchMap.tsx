import { useMemo, useState } from "react";
import { clock, teamName, type Assignment, type Observation } from "./labTypes";
import { boxesAt, indexObservations, TEAM_COLOUR, colourFor } from "./LabVideo";
import { heatGrid, PITCH_PRESETS, imageToPitch, toPitch, trackMovement, type PitchSize } from "./metres";
import { feet, type Camera, type PitchKeyframe } from "./pitch";

type Props = {
  rows: Observation[]; camera: Camera; marks: PitchKeyframe[]; size: PitchSize | null; at: number;
  teams: Map<number, Assignment>; selected: number | null; onSize: (size: PitchSize) => void;
};
type View = "live" | "own" | "opponent";
const COLS = 12, ROWS = 8;

function who(info?: Assignment) {
  if (info?.role === "referee") return "Referee";
  if (info?.role === "other") return "Not a player";
  if (!info?.team) return "Unassigned person";
  return `${teamName(info.team)} ${info.role === "goalkeeper" ? "goalkeeper" : "player"}`;
}

/** Spec 610: positions in metres on a top-down pitch, team heat maps and the selected person's running. */
export function PitchMap({ rows, camera, marks, size, at, teams, selected, onSize }: Props) {
  const [view, setView] = useState<View>("live");
  const [custom, setCustom] = useState(false);
  const preset = size && PITCH_PRESETS.find(p => p.size.length_m === size.length_m && p.size.width_m === size.width_m);
  const index = useMemo(() => indexObservations(rows), [rows]);
  const heat = useMemo(() => {
    if (!size || view === "live") return null;
    const teamOf = (track: number) => { const t = teams.get(track); return t?.team && t.role !== "referee" && t.role !== "other" ? t.team : null; };
    return heatGrid(rows, camera, marks, size, teamOf, COLS, ROWS);
  }, [rows, camera, marks, size, view, teams]);
  const moved = useMemo(() => size && selected !== null ? trackMovement(rows.filter(r => r.track_id === selected), camera, marks, size).get(selected) : undefined, [rows, camera, marks, size, selected]);
  const projection = size?imageToPitch(camera,marks,size,at):null;
  const live = size && projection ? boxesAt(index, at).map(o => { const [x, y] = toPitch(projection, feet(o)); return { o, x, y }; })
    .filter(p => p.x > -2 && p.y > -2 && p.x < size.length_m + 2 && p.y < size.width_m + 2) : [];
  const l = size?.length_m ?? 100, w = size?.width_m ?? 64, line = Math.max(l, w) / 250;
  return <section className="panel space-y-3 p-3" aria-label="Pitch map">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-semibold">Pitch map</h2>
      <label className="ml-auto flex items-center gap-2 text-sm">Pitch size
        <select aria-label="Pitch size" className="rounded-lg border border-line bg-ink-900 p-1 text-sm" value={custom || (size && !preset) ? "custom" : preset?.label ?? ""}
          onChange={e => { if (e.target.value === "custom") { setCustom(true); return; } setCustom(false); const p = PITCH_PRESETS.find(x => x.label === e.target.value); if (p) onSize(p.size); }}>
          <option value="" disabled>Choose…</option>{PITCH_PRESETS.map(p => <option key={p.label}>{p.label}</option>)}<option value="custom">Custom…</option>
        </select></label>
      {(custom || (size && !preset)) && <span className="flex items-center gap-1 text-sm">{(["length_m", "width_m"] as const).map(k => <input key={k} type="number" min={k === "length_m" ? 15 : 10} max={k === "length_m" ? 130 : 100} aria-label={k === "length_m" ? "Length in metres" : "Width in metres"} defaultValue={size?.[k] ?? ""} className="w-16 rounded border border-line bg-ink-900 p-1"
        onBlur={e => { const v = Number(e.target.value); if (v > 0) onSize({ length_m: k === "length_m" ? v : size?.length_m ?? 55, width_m: k === "width_m" ? v : size?.width_m ?? 37 }); }} />)} m</span>}
    </div>
    {!size ? <p className="text-sm text-fg-muted">Choose the pitch size to see positions in metres, heat maps and how far each player ran. Measure it if you can; youth pitch sizes vary.</p> : <>
      <div className="flex gap-1" role="group" aria-label="Map view">{([["live", "Live positions"], ["own", "Our team heat map"], ["opponent", "Opponent heat map"]] as [View, string][]).map(([v, label]) =>
        <button key={v} aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md border px-2 py-1 text-xs ${view === v ? "border-accent bg-accent/15" : "border-line text-fg-muted"}`}>{label}</button>)}</div>
      <svg viewBox={`${-2} ${-2} ${l + 4} ${w + 4}`} className="w-full rounded-lg bg-[#14532d]" role="img" aria-label={`Pitch ${l} by ${w} metres, our near touchline at the bottom`}>
        {heat && (() => { const grid = heat[view as "own" | "opponent"], max = Math.max(1, ...grid.flat()), total = Math.max(1, grid.flat().reduce((a, b) => a + b, 0));
          return grid.flatMap((row, r) => row.map((n, c) => n ? <rect key={`${r}-${c}`} x={(c * l) / COLS} y={w - ((r + 1) * w) / ROWS} width={l / COLS} height={w / ROWS} fill={TEAM_COLOUR[view as "own" | "opponent"]} fillOpacity={0.15 + 0.7 * (n / max)} aria-label={`${teamName(view as "own" | "opponent")} spent ${Math.round((100 * n) / total)}% of tracked time here`} /> : null)); })()}
        <g fill="none" stroke="white" strokeOpacity={0.8} strokeWidth={line}>
          <rect x={0} y={0} width={l} height={w} /><line x1={l / 2} y1={0} x2={l / 2} y2={w} /><circle cx={l / 2} cy={w / 2} r={Math.min(9.15, w * 0.15)} />
        </g>
        {view === "live" && live.map(({ o, x, y }) => { const info = teams.get(o.track_id);
          return <circle key={o.track_id} cx={x} cy={w - y} r={o.track_id === selected ? line * 5 : line * 3.2} fill={colourFor(info)} stroke={o.track_id === selected ? "white" : "black"} strokeWidth={line * 0.8}
            aria-label={`${who(info)} at ${Math.round(x)} m along, ${Math.round(y)} m in`} />; })}
      </svg>
      <p className="text-xs text-fg-muted">Positions come from your pitch marks and the pitch size; a misplaced corner shifts them. Tracked people are stretches, not whole matches.</p>
      {selected !== null && <p className="text-sm">{moved && moved.seconds > 0
        ? <>Selected person: <strong>{Math.round(moved.distance_m)} m covered</strong> over {clock(moved.seconds)} tracked · top speed {moved.top_speed_ms.toFixed(1)} m/s ({Math.round(moved.top_speed_ms * 3.6)} km/h)</>
        : "The selected person has no positions on the marked pitch yet."}</p>}
    </>}
  </section>;
}
