import type { PointerEvent as ReactPointerEvent } from "react";
import { H, SHADOW, SHADOW_ID, W, marks } from "../../lib/drawing";
import type { MomentNote, Shape } from "../../lib/viewerState";

/** Spec 230/240: notes and drawings over the video. Marks are stored in 0..1 frame
 *  coordinates and drawn in a 16:9 box, so they land where they were drawn at any size. */
const SHOW_FOR = 8; // seconds a note stays up after its moment starts

export function activeNotes(notes: MomentNote[] | undefined, now: number): MomentNote[] {
  return (notes ?? []).filter((n) => now >= n.time_s - 0.5 && now <= n.time_s + SHOW_FOR);
}

/** SVG attribute names as React wants them (stroke-width -> strokeWidth); data-* stay. */
function reactAttrs(attrs: Record<string, string | number>): Record<string, string | number> {
  return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k.startsWith("data-") ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), v]));
}

/** Every mark as SVG; with `onMarkDown`, each mark can be picked (the eraser). */
export function MarkLayer({ shapes, onMarkDown }: { shapes: Shape[]; onMarkDown?: (index: number, e: ReactPointerEvent) => void }) {
  return <>
    <defs dangerouslySetInnerHTML={{ __html: SHADOW }} />
    <g filter={`url(#${SHADOW_ID})`}>
      {shapes.map((s, i) => (
        <g key={i} data-index={i} className={onMarkDown ? "cursor-pointer transition-opacity hover:opacity-60" : undefined}
          onPointerDown={onMarkDown ? (e) => { e.stopPropagation(); onMarkDown(i, e); } : undefined}>
          {marks(s).map((m, j) => {
            const Tag = m.tag;
            return <Tag key={j} {...reactAttrs(m.attrs)}>{m.text}</Tag>;
          })}
        </g>
      ))}
    </g>
  </>;
}

/** What plays over the video: the notes of moments now on screen. */
export function NoteOverlay({ notes }: { notes: MomentNote[] }) {
  if (!notes.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-label="Notes on this moment" role="note">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <MarkLayer shapes={notes.flatMap((n) => n.shapes)} />
      </svg>
      {notes.filter((n) => n.text).map((n) => (
        <p key={n.moment_id} className="absolute top-3 left-3 max-w-[70%] rounded-lg bg-black/70 px-3 py-2 text-sm text-white shadow">{n.text}</p>
      ))}
    </div>
  );
}
