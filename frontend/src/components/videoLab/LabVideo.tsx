import { useEffect, useMemo, useState, type RefObject } from "react";
import type { Assignment, Assignments, Observation } from "./labTypes";
import { inPlay, mergeDense, type DenseTracks } from "./playArea";
import { feet, footMargin, insidePitch, outlineAt, type Camera, type Corners, type PitchKeyframe } from "./pitch";
import type { Landmark } from "./landmarks";
import { boundaryAt, halfwayAt, type Boundary } from "./boundary";
import { BoundaryLayer } from "./BoundaryEditor";
import { MarkLayer, PAD } from "./MarkLayer";
import { ballAt, type BallPoint } from "./ball";

export const TEAM_COLOUR = { own: "#38bdf8", opponent: "#fb923c", referee: "#facc15", other: "#94a3b8", none: "#e2e8f0" };

export function colourFor(info: Assignment | undefined) {
  if (info?.role === "referee") return TEAM_COLOUR.referee;
  if (info?.role === "other") return TEAM_COLOUR.other;
  return info?.team ? TEAM_COLOUR[info.team] : TEAM_COLOUR.none;
}

export function shortLabel(info: Assignment | undefined) {
  if (!info || info.source === "none" || (!info.team && !info.role)) return "?";
  if (info.role === "referee") return "Ref";
  if (info.role === "other") return "Not a player";
  const side = info.team === "own" ? "Our" : info.team === "opponent" ? "Opp" : "?";
  return `${side}${info.role === "goalkeeper" ? " GK" : ""}${info.source === "you" ? "" : info.source === "kit" ? " (kit)" : " (suggested)"}`;
}

export type ObservationIndex = { times: number[]; rows: Map<number, Observation[]> };
const HOLD_S = 0.5, BRIDGE_S = 0.75;
const usable = (r: Observation) => r.image_box?.length === 4 && r.image_box.every(n => Number.isFinite(n) && n >= 0 && n <= 1);

export function indexObservations(observations: Observation[]): ObservationIndex {
  const rows = new Map<number, Observation[]>();
  for (const row of observations) if (usable(row)) { const list = rows.get(row.time_s) ?? []; list.push(row); rows.set(row.time_s, list); }
  return { times: [...rows.keys()].sort((a, b) => a - b), rows };
}

/** People at the playhead: each box glides between neighbouring detection samples; a person missing from the next sample is held for half a second only. */
export function boxesAt(index: ObservationIndex, at: number): Observation[] {
  let lo = 0, hi = index.times.length - 1, found = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (index.times[mid] <= at) { found = mid; lo = mid + 1; } else hi = mid - 1; }
  if (found < 0) return [];
  const t0 = index.times[found], t1 = index.times[found + 1];
  const bridge = t1 !== undefined && t1 - t0 <= BRIDGE_S;
  const next = new Map(bridge ? (index.rows.get(t1) ?? []).map(r => [r.track_id, r]) : []);
  const f = bridge ? Math.min(1, (at - t0) / (t1 - t0)) : 0;
  const out: Observation[] = [];
  for (const row of index.rows.get(t0) ?? []) {
    const later = next.get(row.track_id);
    if (later) out.push({ ...row, image_box: row.image_box!.map((n, i) => n + (later.image_box![i] - n) * f) });
    else if (at - t0 <= HOLD_S) out.push(row);
  }
  return out;
}

/** Ellipse lying on the pitch under a person's feet. */
export function footRing([x1, , x2, y2]: number[], w: number, h: number) {
  const rx = Math.max((x2 - x1) * w * 0.8, w / 160);
  return { cx: ((x1 + x2) / 2) * w, cy: y2 * h, rx, ry: rx * 0.3 };
}

function pillLabel(info: Assignment | undefined) {
  if (!info || info.source === "none" || (!info.team && !info.role)) return "Not assigned";
  if (info.role === "referee") return "Referee";
  if (info.role === "other") return "Not a player";
  const side = info.team === "own" ? "Our team" : info.team === "opponent" ? "Opponent" : "No team";
  return `${side}${info.role === "goalkeeper" ? " · GK" : ""}${info.source === "you" ? "" : info.source === "kit" ? " · matched by kit" : " · suggested"}`;
}

/** Playhead time for every painted video frame while playing (timeupdate fires only about four times a second). */
function useFrameTime(videoRef: RefObject<HTMLVideoElement | null>, at: number) {
  const [frame, setFrame] = useState<number | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number; cancelVideoFrameCallback?: (id: number) => void };
    const v = video as FrameVideo;
    let handle = 0, stopped = true;
    const tick = (time: number) => { if (stopped) return; setFrame(time); schedule(); };
    const schedule = () => {
      if (v.requestVideoFrameCallback) handle = v.requestVideoFrameCallback((_, meta) => tick(meta.mediaTime));
      else handle = requestAnimationFrame(() => tick(v.currentTime));
    };
    const start = () => { if (!stopped) return; stopped = false; schedule(); };
    const stop = () => { stopped = true; if (v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(handle); else cancelAnimationFrame(handle); setFrame(null); };
    v.addEventListener("play", start); v.addEventListener("pause", stop); v.addEventListener("ended", stop);
    return () => { v.removeEventListener("play", start); v.removeEventListener("pause", stop); v.removeEventListener("ended", stop); stop(); };
  }, [videoRef]);
  return frame ?? at;
}

type Props = {
  src: string; videoRef: RefObject<HTMLVideoElement | null>; at: number; onTime: (at: number) => void;
  assignments?: Assignments; teams: Map<number, Assignment>; selected: number | null; onSelect: (track: number) => void; showBoxes: boolean;
  dense?: DenseTracks; everyone?: boolean;
  /** Team at a moment (spec 660: the kit can change on one tracklet when the tracker swaps people). */
  teamAt?: (track: number, time: number) => Assignment | undefined;
  ball?: BallPoint[]; showBall?: boolean;
  markLandmarks?: Landmark[]; onMarkLandmarks?: (points: Landmark[]) => void;
  boundaries?: Boundary[]; automaticBoundaries?: Boundary[]; boundaryEditing?:Corners|null; onBoundaryEditing?:(p:Corners)=>void; boundarySelected?:number; onBoundarySelect?:(n:number)=>void;
  camera?: Camera; marks?: PitchKeyframe[]; showOutline?: boolean; marking?: Corners | null; onMarking?: (corners: Corners) => void;
};

export function LabVideo({ src, videoRef, at, onTime, assignments, teams, selected, onSelect, showBoxes, dense, everyone = false, teamAt, ball, showBall = true, camera, marks = [], showOutline = true, marking = null, onMarking, markLandmarks, onMarkLandmarks, boundaries=[], automaticBoundaries=[], boundaryEditing=null, onBoundaryEditing, boundarySelected=0, onBoundarySelect }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const index = useMemo(() => indexObservations(mergeDense(assignments?.observations ?? [], dense)), [assignments, dense]);
  const now = useFrameTime(videoRef, at);
  const w = assignments?.image_width ?? 1920, h = assignments?.image_height ?? 1080;
  const here = showBoxes && assignments ? boxesAt(index, now) : [];
  const frameTeams = new Map<number, Assignment>();
  for (const o of here) { const info = teamAt?.(o.track_id, now) ?? teams.get(o.track_id); if (info) frameTeams.set(o.track_id, info); }
  const ballNow = showBall && ball?.length ? ballAt(ball, now) : null;
  // Spec 600: the owner's pitch outline, carried with the camera; without one, the far-edge rule.
  const outline = camera ? boundaryAt(camera,boundaries,automaticBoundaries,now) ?? outlineAt(camera, marks, now) : null;
  const halfway = camera ? halfwayAt(camera, now) : null;
  const visible = everyone ? here : outline
    ? here.filter(o => o.track_id === selected || insidePitch(feet(o), outline, footMargin(o)))
    : inPlay(here, frameTeams, selected);
  const glows = Object.entries(TEAM_COLOUR);
  // Draw the selected person last so their highlight sits on top.
  const ordered = [...visible].sort((a, b) => Number(a.track_id === selected) - Number(b.track_id === selected));
  return <div className="relative overflow-hidden rounded-xl bg-black">
    <div className="relative transition-transform" style={marking || boundaryEditing ? { transform: `scale(${1 - 2 * PAD})` } : undefined}>
    <video ref={videoRef} onTimeUpdate={e => onTime(e.currentTarget.currentTime)} onSeeked={e => onTime(e.currentTarget.currentTime)} className="aspect-video w-full" controls preload="metadata" src={src} aria-label="Match video" />
    {((showBoxes && assignments) || ballNow) && <svg className="pointer-events-none absolute inset-x-0 top-0 aspect-video w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-label="People on screen">
      <defs>{glows.map(([key, colour]) => <linearGradient key={key} id={`lab-glow-${key}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={colour} stopOpacity="0" /><stop offset="0.55" stopColor={colour} stopOpacity="0.22" /><stop offset="1" stopColor={colour} stopOpacity="0.55" />
      </linearGradient>)}</defs>
      {outline && showOutline && !marking && !boundaryEditing && <polygon points={outline.map(([x, y]) => `${x * w},${y * h}`).join(" ")} fill="#22c55e" fillOpacity={0.05} stroke="white" strokeOpacity={0.7} strokeWidth={h / 400} strokeDasharray={`${h / 60} ${h / 90}`} aria-label="Pitch outline" />}
      {halfway && showOutline && !marking && !boundaryEditing && <polyline points={halfway.map(([x, y]) => `${x * w},${y * h}`).join(" ")} fill="none" stroke="#f59e0b" strokeOpacity={0.85} strokeWidth={h / 350} strokeDasharray={`${h / 50} ${h / 80}`} aria-label="Halfway line" />}
      {ordered.map(row => {
        const [x1, y1, x2, y2] = row.image_box!;
        const info = frameTeams.get(row.track_id);
        const colour = colourFor(info);
        const key = glows.find(([, c]) => c === colour)?.[0] ?? "none";
        const focus = row.track_id === selected || row.track_id === hover;
        const yours = info?.source === "you";
        const ring = footRing(row.image_box!, w, h);
        const bw = (x2 - x1) * w, bh = (y2 - y1) * h;
        const label = pillLabel(info).toUpperCase();
        const fs = h / 52, pw = label.length * fs * 0.62 + fs * 2.4, ph = fs * 1.7, py = ring.cy + ring.ry + h / 120;
        return <g key={row.track_id} className="pointer-events-auto cursor-pointer" role="button" aria-label={`Person ${row.track_id}: ${shortLabel(info)}`}
          onClick={e => { e.stopPropagation(); onSelect(row.track_id); }} onMouseEnter={() => setHover(row.track_id)} onMouseLeave={() => setHover(null)}>
          <rect x={ring.cx - bw * 0.75} y={y1 * h - bh * 0.1} width={bw * 1.5} height={bh * 1.1 + ring.ry} fill="transparent" pointerEvents="all" />
          {focus && <rect x={ring.cx - bw * 0.7} y={y1 * h - bh * 0.05} width={bw * 1.4} height={bh * 1.05} rx={bw * 0.25} fill={`url(#lab-glow-${key})`} />}
          <ellipse cx={ring.cx} cy={ring.cy} rx={ring.rx} ry={ring.ry} fill="none" stroke="black" strokeOpacity={0.35} strokeWidth={h / 260 + h / 400} />
          <ellipse cx={ring.cx} cy={ring.cy} rx={ring.rx} ry={ring.ry} fill={colour} fillOpacity={focus ? 0.22 : yours ? 0.12 : 0} stroke={colour} strokeOpacity={yours || focus ? 1 : info?.source === "kit" ? 0.9 : 0.7} strokeWidth={focus ? h / 230 : yours ? h / 300 : info?.source === "kit" ? h / 340 : h / 420} />
          {focus && <g>
            <rect x={ring.cx - pw / 2} y={py} width={pw} height={ph} rx={ph / 2} fill="#0b1220" fillOpacity={0.88} stroke={colour} strokeOpacity={0.6} strokeWidth={h / 900} />
            <circle cx={ring.cx - pw / 2 + fs * 0.95} cy={py + ph / 2} r={fs * 0.32} fill={colour} />
            <text x={ring.cx + fs * 0.55} y={py + ph / 2} dominantBaseline="central" textAnchor="middle" fill="white" fontSize={fs} fontWeight={700} letterSpacing={fs * 0.06}>{label}</text>
          </g>}
        </g>;
      })}
      {ballNow && <g aria-label="Ball" role="img">
        <circle cx={ballNow.x * w} cy={ballNow.y * h} r={Math.max(ballNow.r * w * 1.7, h / 80)} fill="none" stroke="black" strokeOpacity={0.4} strokeWidth={h / 250} />
        <circle cx={ballNow.x * w} cy={ballNow.y * h} r={Math.max(ballNow.r * w * 1.7, h / 80)} fill="#fde047" fillOpacity={0.15} stroke="#fde047" strokeWidth={h / 360} />
      </g>}
    </svg>}
    </div>
    {boundaryEditing && onBoundaryEditing && <BoundaryLayer points={boundaryEditing} onChange={onBoundaryEditing} selected={boundarySelected} onSelect={onBoundarySelect ?? (()=>undefined)} />}
    {marking && onMarking && <MarkLayer corners={marking} onChange={onMarking} landmarks={markLandmarks} onLandmarks={onMarkLandmarks} />}
  </div>;
}
