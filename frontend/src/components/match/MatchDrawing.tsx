import { Camera, CircleDot, Eraser, Footprints, Hash, MoveUpRight, PenLine, PenTool, Pencil, Redo2, Slash, Spline, SquareDashed, Trash, Type, Undo2, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { HudlMoment } from "../../api/hudl";
import { COLOURS, DEFAULT_COLOUR, H, W, curveThrough, drawingFileName, finish, frameNoteId, isFrameNote } from "../../lib/drawing";
import { captureDrawing, saveFile } from "../../lib/frameCapture";
import { formatClock } from "../../lib/format";
import type { MomentNote, Shape, ShapeKind } from "../../lib/viewerState";
import { Button } from "../ui/Button";
import { MarkLayer, NoteOverlay, activeNotes } from "./NoteLayer";

/** Spec 240: the drawing board. A toolbar under the video (above Match insights) opens
 *  a drawing surface over the paused frame; drawings are saved as data with the note
 *  (spec 230), on a tagged moment or on any frame, and export as a PNG screenshot. */
type Tool = ShapeKind | "erase";
const TOOLS: { tool: Tool; key: string; label: string; icon: typeof Pencil }[] = [
  { tool: "pen", key: "p", label: "Pen", icon: Pencil },
  { tool: "arrow", key: "a", label: "Arrow", icon: MoveUpRight },
  { tool: "dashed", key: "r", label: "Dashed run", icon: Footprints },
  { tool: "curve", key: "c", label: "Curved arrow", icon: Spline },
  { tool: "line", key: "l", label: "Line", icon: Slash },
  { tool: "spotlight", key: "s", label: "Spotlight", icon: CircleDot },
  { tool: "zone", key: "z", label: "Zone", icon: SquareDashed },
  { tool: "text", key: "t", label: "Text label", icon: Type },
  { tool: "marker", key: "m", label: "Player marker", icon: Hash },
  { tool: "erase", key: "e", label: "Eraser", icon: Eraser },
];
const WIDTHS = [{ width: 1, label: "Thin" }, { width: 2, label: "Medium" }, { width: 3, label: "Thick" }] as const;
const COLOUR_NAMES = ["Yellow", "White", "Red", "Cyan", "Green", "Orange"];

type Target = { moment_id: string; time_s: number; caption: ReactNode; moment: boolean };
type Session = { target: Target; text: string; past: Shape[][]; shapes: Shape[]; future: Shape[][]; existing: boolean };

const round = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 1e4) / 1e4;
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

const toolClass = "grid size-9 shrink-0 place-items-center rounded-xl text-fg-muted transition hover:bg-white/10 hover:text-fg aria-pressed:bg-gradient-to-br aria-pressed:from-accent-strong aria-pressed:to-[#3b82f6] aria-pressed:text-ink-950 aria-pressed:shadow-[0_0_18px_-4px_rgb(34_211_238/0.85)] disabled:opacity-30";
const Divider = () => <span aria-hidden className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />;

export function MatchDrawing({ matchId, title, notes, target, now, saving, error, onSave, onGoTo, children }: {
  matchId: string; title: string; notes: MomentNote[] | undefined; target?: HudlMoment; now: number;
  saving: boolean; error?: string; onSave: (note: MomentNote, done: () => void) => void; onGoTo: (time: number) => void; children: ReactNode;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tool, setTool] = useState<Tool>("arrow");
  const [colour, setColour] = useState(DEFAULT_COLOUR);
  const [width, setWidth] = useState<1 | 2 | 3>(2);
  const [shot, setShot] = useState<{ busy?: boolean; message?: string; error?: boolean }>({});
  const video = () => stage.current?.querySelector("video") ?? null;
  const drawings = (notes ?? []).filter((n) => n.shapes.length > 0).sort((a, b) => a.time_s - b.time_s);

  const open = (t: Target, existing?: MomentNote) => {
    video()?.pause();
    setSession({ target: t, text: existing?.text ?? "", past: [], shapes: existing?.shapes ?? [], future: [], existing: !!existing });
  };
  const drawHere = () => {
    const at = Math.round((video()?.currentTime ?? now) * 10) / 10;
    const near = (notes ?? []).find((n) => isFrameNote(n) && Math.abs(n.time_s - at) <= 0.5);
    open({ moment_id: near?.moment_id ?? frameNoteId(matchId, at), time_s: near?.time_s ?? at, moment: false,
      caption: <>Drawing at <span className="text-pin">{formatClock(near?.time_s ?? at)}</span></> }, near);
  };
  const noteMoment = (m: HudlMoment) => open({ moment_id: m.id, time_s: m.time_s, moment: true,
    caption: <>Note at <span className="text-pin">{formatClock(m.time_s)}</span> · {m.category}</> }, notes?.find((n) => n.moment_id === m.id));

  const commit = (next: Shape[]) => setSession((s) => s && { ...s, past: [...s.past, s.shapes], shapes: next, future: [] });
  const undo = () => setSession((s) => s && s.past.length ? { ...s, past: s.past.slice(0, -1), shapes: s.past[s.past.length - 1], future: [s.shapes, ...s.future] } : s);
  const redo = () => setSession((s) => s && s.future.length ? { ...s, past: [...s.past, s.shapes], shapes: s.future[0], future: s.future.slice(1) } : s);
  const save = (text: string, shapes: Shape[]) => {
    if (!session) return;
    onSave({ moment_id: session.target.moment_id, match_id: matchId, time_s: session.target.time_s, text, shapes }, () => setSession(null));
  };

  const screenshot = async () => {
    const shapes = session ? session.shapes : activeNotes(notes, now).flatMap((n) => n.shapes);
    const text = session ? session.text : activeNotes(notes, now).map((n) => n.text).filter(Boolean).join(" · ");
    const time = session?.target.time_s ?? video()?.currentTime ?? now;
    setShot({ busy: true });
    try {
      const { blob, frame } = await captureDrawing(video(), shapes, text);
      const name = drawingFileName(title, time);
      saveFile(blob, name);
      setShot({ message: frame ? `Saved ${name}` : `Saved ${name} without the video frame (the browser would not share it)` });
    } catch (e) {
      setShot({ error: true, message: e instanceof Error ? e.message : "The screenshot could not be made." });
    }
  };

  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod || e.altKey) return;
      if (e.key === "Escape") { setSession(null); return; }
      const pick = TOOLS.find((t) => t.key === e.key.toLowerCase());
      if (pick) setTool(pick.tool);
      else if (["1", "2", "3"].includes(e.key)) setWidth(Number(e.key) as 1 | 2 | 3);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session !== null]);

  const shotMessage = shot.message && <span role={shot.error ? "alert" : "status"} className={`text-xs ${shot.error ? "text-danger" : "text-fg-muted"}`}>{shot.message}</span>;

  return <>
    <div ref={stage} className="relative">
      {children}
      {session
        ? <Surface shapes={session.shapes} tool={tool} colour={colour} width={width} onAdd={(s) => commit([...session.shapes, s])} onErase={(i) => commit(session.shapes.filter((_, j) => j !== i))} />
        : <NoteOverlay notes={activeNotes(notes, now)} />}
    </div>
    {session ? (
      <div role="toolbar" aria-label="Drawing tools" className="space-y-2 rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/95 to-ink-900/95 p-2 shadow-[0_14px_40px_-18px_rgb(0_0_0/0.9)] ring-1 ring-accent/20">
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex flex-wrap items-center gap-0.5 rounded-xl bg-black/25 p-0.5">
            {TOOLS.map(({ tool: t, key, label, icon: Icon }) => (
              <button key={t} type="button" className={toolClass} aria-pressed={tool === t} aria-label={`${label} (${key.toUpperCase()})`} title={`${label} (${key.toUpperCase()})`} onClick={() => setTool(t)}><Icon size={17} aria-hidden /></button>
            ))}
          </div>
          <Divider />
          <div className="flex items-center gap-1.5 px-1">
            {COLOURS.map((c, i) => (
              <button key={c} type="button" aria-label={`${COLOUR_NAMES[i]} ink`} aria-pressed={colour === c} title={COLOUR_NAMES[i]} onClick={() => setColour(c)}
                className={`size-6 rounded-full transition ${colour === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-ink-900" : "opacity-80 hover:opacity-100"}`} style={{ background: c, boxShadow: colour === c ? `0 0 14px ${c}` : undefined }} />
            ))}
          </div>
          <Divider />
          <div className="flex items-center gap-0.5 rounded-xl bg-black/25 p-0.5">
            {WIDTHS.map(({ width: w, label }) => (
              <button key={w} type="button" className={toolClass} aria-pressed={width === w} aria-label={`${label} stroke (${w})`} title={`${label} (${w})`} onClick={() => setWidth(w)}>
                <span aria-hidden className="rounded-full bg-current" style={{ width: 4 + w * 4, height: 4 + w * 4 }} />
              </button>
            ))}
          </div>
          <Divider />
          <button type="button" className={toolClass} aria-label="Undo (Cmd/Ctrl+Z)" title="Undo (Cmd/Ctrl+Z)" disabled={!session.past.length} onClick={undo}><Undo2 size={17} aria-hidden /></button>
          <button type="button" className={toolClass} aria-label="Redo (Shift+Cmd/Ctrl+Z)" title="Redo (Shift+Cmd/Ctrl+Z)" disabled={!session.future.length} onClick={redo}><Redo2 size={17} aria-hidden /></button>
          <button type="button" className={toolClass} aria-label="Clear all marks" title="Clear all marks" disabled={!session.shapes.length} onClick={() => commit([])}><Trash size={16} aria-hidden /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
          <span className="text-fg-muted">{session.target.caption}</span>
          <input aria-label="Note" className="field min-w-[12rem] flex-1 py-1.5 text-sm" maxLength={2000} value={session.text} placeholder="Add a note to show with this drawing"
            onChange={(e) => { const text = e.target.value; setSession((s) => s && { ...s, text }); }} />
          {session.existing && <Button variant="ghost" disabled={saving} onClick={() => save("", [])}><Eraser size={14} /> {session.target.moment ? "Remove note" : "Remove drawing"}</Button>}
          {error && <span role="alert" className="text-danger">{error}</span>}
          {shotMessage}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button variant="ghost" aria-label="Download screenshot" title="Download a PNG of this frame with the drawing" disabled={shot.busy} onClick={screenshot}><Camera size={15} /> <span className="hidden md:inline">Screenshot</span></Button>
            <Button variant="ghost" aria-label="Cancel drawing" onClick={() => setSession(null)}><X size={15} /></Button>
            <Button variant="primary" disabled={saving || (!session.text.trim() && !session.shapes.length)} onClick={() => save(session.text, session.shapes)}>{session.target.moment ? "Save note" : "Save drawing"}</Button>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button onClick={drawHere}><PenTool size={15} className="text-accent" /> Draw on video</Button>
        {target && <Button onClick={() => noteMoment(target)}><PenLine size={14} /> {notes?.some((n) => n.moment_id === target.id) ? "Edit note" : "Note / draw"} on {formatClock(target.time_s)} {target.category}</Button>}
        <Button variant="ghost" aria-label="Download screenshot" title="Download a PNG of this frame with any drawing on it" disabled={shot.busy} onClick={screenshot}><Camera size={15} /> Screenshot</Button>
        {drawings.length > 0 && <span className="ml-auto flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          Drawings
          {drawings.slice(0, 8).map((n) => (
            <button key={n.moment_id} type="button" aria-label={`Go to drawing at ${formatClock(n.time_s)}`} title={n.text || undefined} onClick={() => onGoTo(n.time_s)}
              className="rounded-full border border-pin/30 bg-pin/10 px-2 py-0.5 tabular-nums text-pin hover:bg-pin/20">{formatClock(n.time_s)}</button>
          ))}
          {drawings.length > 8 && <span>+{drawings.length - 8}</span>}
        </span>}
        {error && <span role="alert" className="text-danger">{error}</span>}
        {shotMessage}
      </div>
    )}
  </>;
}

/** The drawing surface over the paused frame. */
function Surface({ shapes, tool, colour, width, onAdd, onErase }: {
  shapes: Shape[]; tool: Tool; colour: string; width: 1 | 2 | 3; onAdd: (s: Shape) => void; onErase: (index: number) => void;
}) {
  const box = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<Shape | null>(null);
  const swoop = useRef<[number, number][]>([]);
  const [label, setLabel] = useState<{ x: number; y: number; text: string } | null>(null);
  const point = (e: React.PointerEvent): [number, number] => {
    const r = box.current!.getBoundingClientRect();
    return [round((e.clientX - r.left) / (r.width || 1)), round((e.clientY - r.top) / (r.height || 1))];
  };
  const down = (e: React.PointerEvent) => {
    if (tool === "erase" || label) return;
    const [x, y] = point(e);
    if (tool === "text") { setLabel({ x, y, text: "" }); return; }
    if (tool === "marker") {
      onAdd({ kind: "marker", x1: x, y1: y, x2: x, y2: y, colour, width, label: String(shapes.filter((s) => s.kind === "marker").length + 1) });
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    swoop.current = [[x, y]];
    setDraft({ kind: tool, x1: x, y1: y, x2: x, y2: y, colour, width, ...(tool === "pen" ? { points: [[x, y]] } : {}) });
  };
  const move = (e: React.PointerEvent) => {
    if (!draft) return;
    const [x, y] = point(e);
    swoop.current.push([x, y]);
    if (draft.kind === "pen") setDraft({ ...draft, x2: x, y2: y, points: [...(draft.points ?? []), [x, y]] });
    else if (draft.kind === "curve") setDraft({ ...draft, x2: x, y2: y, ...curveThrough(draft.x1, draft.y1, x, y, swoop.current) });
    else setDraft({ ...draft, x2: x, y2: y });
  };
  const up = () => {
    if (!draft) return;
    const done = finish(draft);
    if (done) onAdd(done);
    setDraft(null);
  };
  const place = () => {
    if (label?.text.trim()) onAdd({ kind: "text", x1: label.x, y1: label.y, x2: label.x, y2: label.y, colour, width, label: label.text.trim().slice(0, 40) });
    setLabel(null);
  };
  return <>
    <svg ref={box} aria-label="Drawing area" role="img" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full touch-none rounded-xl ring-2 ring-accent/70 shadow-[inset_0_0_60px_rgb(34_211_238/0.12)] ${tool === "erase" ? "cursor-default" : tool === "text" ? "cursor-text" : "cursor-crosshair"}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDraft(null)}>
      <MarkLayer shapes={draft ? [...shapes, draft] : shapes} onMarkDown={tool === "erase" ? (i) => onErase(i) : undefined} />
    </svg>
    <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent uppercase">● Drawing</span>
    {label && <input autoFocus aria-label="Label text" maxLength={40} value={label.text} placeholder="Type, then Enter"
      className="absolute z-10 w-48 -translate-y-1/2 rounded-full border border-accent/60 bg-ink-950/90 px-3 py-1 text-sm text-fg shadow-lg outline-none"
      style={{ left: `${label.x * 100}%`, top: `${label.y * 100}%` }}
      onChange={(e) => setLabel({ ...label, text: e.target.value })} onBlur={place}
      onKeyDown={(e) => { if (e.key === "Enter") place(); if (e.key === "Escape") { e.stopPropagation(); setLabel(null); } }} />}
  </>;
}
