import { useRef } from "react";
import type { Landmark } from "./landmarks";
import { isBoxPoint } from "./pitchMarkers";
import type { Corners } from "./pitch";

/** Margin around the shrunken video while marking, so off-screen corners can be placed. */
export const PAD = 0.15;
const NAMES = ["Near-left corner", "Near-right corner", "Far-right corner", "Far-left corner"];
const clamp = (v: number) => Math.min(3, Math.max(-2, v));

/** Four draggable pitch corners over the video (normalised video coordinates; may lie outside it). */
export function MarkLayer({ corners, onChange, landmarks = [], onLandmarks }: { corners: Corners; onChange: (corners: Corners) => void; landmarks?: Landmark[]; onLandmarks?: (points: Landmark[]) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const span = 1 / (1 - 2 * PAD), origin = -PAD * span;
  const move = (i: number, x: number, y: number) => { if(i<4) onChange(corners.map((c,n)=>n===i?[clamp(x),clamp(y)]:c) as Corners); else onLandmarks?.(landmarks.map((l,n)=>n===i-4?{...l,image:[clamp(x),clamp(y)]}:l)); };
  const names=[...NAMES,...landmarks.map(l=>l.name ?? "Pitch point")];
  const points=[...corners,...landmarks.map(l=>l.image)];
  // Spec 800: the halfway line between its two ends, so you can line it up with the painted one.
  const near=landmarks.find(l=>l.name==="Near halfway intersection"),far=landmarks.find(l=>l.name==="Far halfway intersection");
  const boxes=(["Left","Right"] as const).map(side=>({side,points:["near goal-line end","near front corner","far front corner","far goal-line end"].flatMap(p=>landmarks.filter(l=>l.name===`${side} box, ${p}`).map(l=>l.image))})).filter(b=>b.points.length>=2);
  function drag(i: number, e: React.PointerEvent) {
    const r = svg.current!.getBoundingClientRect();
    move(i, origin + ((e.clientX - r.left) / r.width) * span, origin + ((e.clientY - r.top) / r.height) * span);
  }
  return <svg ref={svg} className="absolute inset-0 h-full w-full touch-none" viewBox={`${origin} ${origin} ${span} ${span}`} preserveAspectRatio="none" aria-label="Mark the pitch corners">
    <polygon points={corners.map(([x, y]) => `${x},${y}`).join(" ")} fill="#22c55e" fillOpacity={0.12} stroke="#22c55e" strokeWidth={0.004} vectorEffect="non-scaling-stroke" />
    {near && far && <line x1={near.image[0]} y1={near.image[1]} x2={far.image[0]} y2={far.image[1]} stroke="#f59e0b" strokeWidth={0.004} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" aria-label="Halfway line being marked" />}
    {boxes.map(b => <polyline key={b.side} points={b.points.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke="white" strokeWidth={0.004} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" aria-label={`${b.side} penalty box being marked`} />)}
    {points.map(([x, y], i) => <g key={names[i]}>
      <ellipse cx={x} cy={y} rx={0.012} ry={0.0213} fill={i<4?"#22c55e":/halfway intersection/.test(names[i])?"#f59e0b":isBoxPoint(names[i])?"#e2e8f0":"#38bdf8"} stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" className="cursor-grab focus:outline-none"
        role="slider" tabIndex={0} aria-label={names[i]} aria-valuetext={`${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`} aria-valuenow={Math.round(x * 100)}
        onPointerDown={e => { (e.target as Element).setPointerCapture(e.pointerId); drag(i, e); }}
        onPointerMove={e => { if ((e.target as Element).hasPointerCapture?.(e.pointerId)) drag(i, e); }}
        onKeyDown={e => { const d = e.shiftKey ? 0.02 : 0.004; const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; if (k[e.key]) { e.preventDefault(); move(i, x + k[e.key][0], y + k[e.key][1]); } }} />
      {!isBoxPoint(names[i]) && <text x={x} y={y - 0.035} textAnchor="middle" fontSize={0.022} fill="white" stroke="black" strokeWidth={0.003} paintOrder="stroke">{names[i].replace(" corner", "")}</text>}
    </g>)}
  </svg>;
}
