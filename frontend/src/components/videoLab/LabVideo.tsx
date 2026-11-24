import { useMemo, useState, type RefObject } from "react";
import type { Assignment, Assignments, Observation } from "./labTypes";

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
  return `${side}${info.role === "goalkeeper" ? " GK" : ""}${info.source === "you" ? "" : " (suggested)"}`;
}

/** Sampled boxes at the playhead (never held across a gap of more than half a second). */
export function boxesAt(index: { times: number[]; rows: Map<number, Observation[]> }, at: number) {
  let lo = 0, hi = index.times.length - 1, found = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (index.times[mid] <= at) { found = mid; lo = mid + 1; } else hi = mid - 1; }
  if (found < 0 || at - index.times[found] > 0.5) return [];
  return (index.rows.get(index.times[found]) ?? []).filter(r => r.image_box?.length === 4 && r.image_box.every(n => Number.isFinite(n) && n >= 0 && n <= 1));
}

type Props = {
  src: string; videoRef: RefObject<HTMLVideoElement | null>; at: number; onTime: (at: number) => void;
  assignments?: Assignments; teams: Map<number, Assignment>; selected: number | null; onSelect: (track: number) => void; showBoxes: boolean;
};

export function LabVideo({ src, videoRef, at, onTime, assignments, teams, selected, onSelect, showBoxes }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const index = useMemo(() => {
    const rows = new Map<number, Observation[]>();
    for (const row of assignments?.observations ?? []) { const list = rows.get(row.time_s) ?? []; list.push(row); rows.set(row.time_s, list); }
    return { times: [...rows.keys()].sort((a, b) => a - b), rows };
  }, [assignments]);
  const visible = showBoxes && assignments ? boxesAt(index, at) : [];
  const w = assignments?.image_width ?? 1920, h = assignments?.image_height ?? 1080;
  return <div className="relative overflow-hidden rounded-xl bg-black">
    <video ref={videoRef} onTimeUpdate={e => onTime(e.currentTarget.currentTime)} onSeeked={e => onTime(e.currentTarget.currentTime)} className="aspect-video w-full" controls preload="metadata" src={src} aria-label="Match video" />
    {showBoxes && assignments && <svg className="pointer-events-none absolute inset-x-0 top-0 aspect-video w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-label="People on screen">
      {visible.map(row => {
        const [x1, y1, x2, y2] = row.image_box!;
        const info = teams.get(row.track_id);
        const colour = colourFor(info);
        const focus = row.track_id === selected || row.track_id === hover;
        const guess = !info || info.source !== "you";
        return <g key={row.track_id} className="pointer-events-auto cursor-pointer" role="button" aria-label={`Person ${row.track_id}: ${shortLabel(info)}`}
          onClick={e => { e.stopPropagation(); onSelect(row.track_id); }} onMouseEnter={() => setHover(row.track_id)} onMouseLeave={() => setHover(null)}>
          <rect x={x1 * w} y={y1 * h} width={(x2 - x1) * w} height={(y2 - y1) * h} fill={focus ? `${colour}33` : "transparent"} stroke={colour} strokeWidth={focus ? w / 220 : w / 420} strokeDasharray={guess ? `${w / 120} ${w / 200}` : undefined} />
          {(focus || info?.source === "you") && <text x={x1 * w} y={Math.max(h / 40, y1 * h - h / 160)} fill={colour} stroke="black" strokeWidth={w / 1400} paintOrder="stroke" fontSize={h / 42}>{shortLabel(info)}</text>}
        </g>;
      })}
    </svg>}
  </div>;
}
