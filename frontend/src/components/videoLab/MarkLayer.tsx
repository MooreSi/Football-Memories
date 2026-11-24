import { useRef } from "react";
import type { Landmark } from "./landmarks";
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
  function drag(i: number, e: React.PointerEvent) {
    const r = svg.current!.getBoundingClientRect();
    move(i, origin + ((e.clientX - r.left) / r.width) * span, origin + ((e.clientY - r.top) / r.height) * span);
  }
  return <svg ref={svg} className="absolute inset-0 h-full w-full touch-none" viewBox={`${origin} ${origin} ${span} ${span}`} preserveAspectRatio="none" aria-label="Mark the pitch corners">
    <polygon points={corners.map(([x, y]) => `${x},${y}`).join(" ")} fill="#22c55e" fillOpacity={0.12} stroke="#22c55e" strokeWidth={0.004} vectorEffect="non-scaling-stroke" />
    {points.map(([x, y], i) => <g key={names[i]}>
      <ellipse cx={x} cy={y} rx={0.012} ry={0.0213} fill={i<4?"#22c55e":"#38bdf8"} stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" className="cursor-grab focus:outline-none"
        role="slider" tabIndex={0} aria-label={names[i]} aria-valuetext={`${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`} aria-valuenow={Math.round(x * 100)}
        onPointerDown={e => { (e.target as Element).setPointerCapture(e.pointerId); drag(i, e); }}
        onPointerMove={e => { if ((e.target as Element).hasPointerCapture?.(e.pointerId)) drag(i, e); }}
        onKeyDown={e => { const d = e.shiftKey ? 0.02 : 0.004; const k: Record<string, [number, number]> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }; if (k[e.key]) { e.preventDefault(); move(i, x + k[e.key][0], y + k[e.key][1]); } }} />
      <text x={x} y={y - 0.035} textAnchor="middle" fontSize={0.022} fill="white" stroke="black" strokeWidth={0.003} paintOrder="stroke">{names[i].replace(" corner", "")}</text>
    </g>)}
  </svg>;
}
