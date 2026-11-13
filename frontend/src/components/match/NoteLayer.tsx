import { Eraser, MoveUpRight, Slash, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import type { HudlMoment } from "../../api/hudl";
import { formatClock } from "../../lib/format";
import type { MomentNote, Shape } from "../../lib/viewerState";
import { Button } from "../ui/Button";

/** Spec 230: notes and drawings over the video. Shapes are stored in 0..1 frame
 *  coordinates and drawn in a 16:9 box, so they land where they were drawn at any size. */
const W = 1600, H = 900;
const COLOURS = ["#facc15", "#ffffff", "#f87171", "#22d3ee"];
const SHOW_FOR = 8; // seconds a note stays up after its moment starts

export function activeNotes(notes: MomentNote[] | undefined, now: number): MomentNote[] {
  return (notes ?? []).filter((n) => now >= n.time_s - 0.5 && now <= n.time_s + SHOW_FOR);
}

function Shapes({ shapes, id }: { shapes: Shape[]; id: string }) {
  return <>
    <defs>{COLOURS.map((c, i) => (
      <marker key={c} id={`${id}-head-${i}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={c} />
      </marker>
    ))}</defs>
    {shapes.map((s, i) => {
      const colour = s.colour ?? COLOURS[0];
      const head = Math.max(0, COLOURS.indexOf(colour));
      return <line key={i} data-shape={s.kind} x1={s.x1 * W} y1={s.y1 * H} x2={s.x2 * W} y2={s.y2 * H} stroke={colour} strokeWidth={10} strokeLinecap="round"
        markerEnd={s.kind === "arrow" ? `url(#${id}-head-${head})` : undefined} />;
    })}
  </>;
}

/** What plays over the video: the notes of moments now on screen. */
export function NoteOverlay({ notes }: { notes: MomentNote[] }) {
  if (!notes.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0" aria-label="Notes on this moment" role="note">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <Shapes id="show" shapes={notes.flatMap((n) => n.shapes)} />
      </svg>
      {notes.filter((n) => n.text).map((n) => (
        <p key={n.moment_id} className="absolute top-3 left-3 max-w-[70%] rounded-lg bg-black/70 px-3 py-2 text-sm text-white shadow">{n.text}</p>
      ))}
    </div>
  );
}

/** Draw arrows and lines over the paused video, and write a note, for one moment. */
export function NoteEditor({ moment, matchId, existing, onSave, onCancel, saving }: {
  moment: HudlMoment; matchId: string; existing?: MomentNote; saving?: boolean;
  onSave: (note: MomentNote) => void; onCancel: () => void;
}) {
  const [shapes, setShapes] = useState<Shape[]>(existing?.shapes ?? []);
  const [text, setText] = useState(existing?.text ?? "");
  const [kind, setKind] = useState<Shape["kind"]>("arrow");
  const [colour, setColour] = useState(COLOURS[0]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const point = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return { x: clamp((e.clientX - r.left) / (r.width || 1)), y: clamp((e.clientY - r.top) / (r.height || 1)) };
  };
  const save = (next: { text: string; shapes: Shape[] }) =>
    onSave({ moment_id: moment.id, match_id: matchId, time_s: moment.time_s, ...next });
  return <>
    <svg ref={box} aria-label="Drawing area" role="img" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full cursor-crosshair touch-none rounded-[inherit] ring-2 ring-pin"
      onPointerDown={(e) => { const p = point(e); (e.target as Element).setPointerCapture?.(e.pointerId); setDraft({ kind, colour, x1: p.x, y1: p.y, x2: p.x, y2: p.y }); }}
      onPointerMove={(e) => { if (draft) { const p = point(e); setDraft({ ...draft, x2: p.x, y2: p.y }); } }}
      onPointerUp={() => { if (draft && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 0.02) setShapes((s) => [...s, draft]); setDraft(null); }}>
      <Shapes id="edit" shapes={draft ? [...shapes, draft] : shapes} />
    </svg>
    <div className="panel absolute right-2 bottom-2 left-2 space-y-2 bg-ink-900/95 p-3" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="mr-auto text-fg-muted">Note at <span className="text-pin">{formatClock(moment.time_s)}</span> · {moment.category}</span>
        <Button variant={kind === "arrow" ? "primary" : "ghost"} aria-pressed={kind === "arrow"} onClick={() => setKind("arrow")}><MoveUpRight size={14} /> Arrow</Button>
        <Button variant={kind === "line" ? "primary" : "ghost"} aria-pressed={kind === "line"} onClick={() => setKind("line")}><Slash size={14} /> Line</Button>
        {COLOURS.map((c) => <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={colour === c} onClick={() => setColour(c)}
          className={`h-5 w-5 rounded-full border-2 ${colour === c ? "border-white" : "border-transparent"}`} style={{ background: c }} />)}
        <Button variant="ghost" disabled={!shapes.length} onClick={() => setShapes((s) => s.slice(0, -1))}><Undo2 size={14} /> Undo</Button>
      </div>
      <label className="block text-xs text-fg-muted">Note
        <textarea className="field mt-1 min-h-[3rem]" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="What to remember about this moment" />
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        {existing && <Button variant="ghost" disabled={saving} onClick={() => save({ text: "", shapes: [] })}><Eraser size={14} /> Remove note</Button>}
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={saving || (!text.trim() && !shapes.length)} onClick={() => save({ text, shapes })}>Save note</Button>
      </div>
    </div>
  </>;
}
