import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BASE, csrfToken } from "../videoLab/useLabData";
import { boxFromDrag, labelsBody, startingBoxes, type Box, type FrameLabel, type Kind, type Labels, type LabelSet, type SetSummary } from "./frameLabels";

/**
 * Spec 670: frames the detector finds hard (overlapping players, unseen or tiny balls), with its
 * boxes as a starting point. Keep, remove or draw boxes, then confirm; only confirmed frames train
 * the next detector. Layout follows reference 02: a rail of rows, a big picture, an action bar.
 */
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const REASON: Record<string, string> = { "players overlap": "Players overlap", "ball unseen": "Ball unseen", "several balls": "Several balls", "small ball": "Small ball", random: "Random check" };
const COLOUR: Record<Kind, string> = { person: "#56b8e6", ball: "#facc15" };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Could not load the label set. Reload the page.");
  return await response.json() as T;
}

export default function LabelFramesPage() {
  const [sets, setSets] = useState<SetSummary[] | null>(null);
  const [set, setSet] = useState<LabelSet | null>(null);
  const [labels, setLabels] = useState<Labels | null>(null);
  const [at, setAt] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [kind, setKind] = useState<Kind>("ball");
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const drag = useRef<number[] | null>(null);
  const picture = useRef<SVGSVGElement | null>(null);

  useEffect(() => { getJson<SetSummary[]>(`${BASE}/label-sets`).then(setSets).catch((e: Error) => setError(e.message)); }, []);

  const open = async (id: string) => {
    setError("");
    try {
      const [s, l] = await Promise.all([getJson<LabelSet>(`${BASE}/label-sets/${id}`), getJson<Labels>(`${BASE}/label-sets/${id}/labels`)]);
      const first = Math.max(0, s.frames.findIndex(f => !l.frames[String(f.index)]));
      setSet(s); setLabels(l); setAt(first); setBoxes(startingBoxes(s.frames[first], l.frames[String(s.frames[first].index)]));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the label set."); }
  };

  const go = useCallback((i: number) => {
    if (!set || !labels || i < 0 || i >= set.frames.length) return;
    setAt(i); setBoxes(startingBoxes(set.frames[i], labels.frames[String(set.frames[i].index)]));
  }, [set, labels]);

  const decide = useCallback(async (status: FrameLabel["status"]) => {
    if (!set || !labels || saving) return;
    const frame = set.frames[at];
    const frames = { ...labels.frames, [String(frame.index)]: { status, boxes: status === "confirmed" ? boxes : [] } };
    setSaving(true);
    try {
      const token = await csrfToken();
      const response = await fetch(`${BASE}/label-sets/${set.id}/labels`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(labelsBody(set, labels.revision, frames)) });
      if (!response.ok) throw new Error(response.status === 409 ? "Labels changed in another window. Reload the page before continuing." : "This frame could not be saved. Try again or reload.");
      const saved = await response.json() as Labels;
      setLabels({ ...saved, frames }); setError("");
      if (at + 1 < set.frames.length) { setAt(at + 1); setBoxes(startingBoxes(set.frames[at + 1], frames[String(set.frames[at + 1].index)])); }
    } catch (e) { setError(e instanceof Error ? e.message : "This frame could not be saved."); }
    finally { setSaving(false); }
  }, [set, labels, at, boxes, saving]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!set || (e.target as HTMLElement)?.closest?.("input,textarea")) return;
      if (e.key === "Enter") void decide("confirmed");
      else if (e.key === "s") void decide("skipped");
      else if (e.key === "b") setKind("ball");
      else if (e.key === "p") setKind("person");
      else if (e.key === "z") setZoom(z => !z);
      else if (e.key === "ArrowRight") go(at + 1);
      else if (e.key === "ArrowLeft") go(at - 1);
      else if (e.key === "Backspace" && boxes.length) setBoxes(b => b.slice(0, -1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [set, at, boxes.length, decide, go]);

  const point = (e: React.PointerEvent) => { const r = picture.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const end = (e: React.PointerEvent) => {
    if (!drag.current || !picture.current) return;
    const r = picture.current.getBoundingClientRect();
    const box = boxFromDrag(drag.current, point(e), r.width, r.height, kind);
    drag.current = null;
    if (box) setBoxes(b => [...b, box]);
  };

  if (!set || !labels) return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="panel p-3" aria-label="Label sets">
        <Link to="/video-lab" className="text-sm text-slate-300 hover:text-white">‹ Video Lab</Link>
        <h1 className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Label frames</h1>
        {sets === null && !error && <p className="mt-2 text-sm text-slate-400">Loading…</p>}
        {sets?.length === 0 && <p className="mt-2 text-sm text-slate-400">No frames waiting. The worker prepares them from a match.</p>}
        <ul className="mt-2 grid gap-1">
          {sets?.map(s => <li key={s.id}><button type="button" onClick={() => void open(s.id)} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"><span className="block font-medium text-white">{s.match_title}</span><span className="text-xs text-slate-400">{s.confirmed} of {s.frames} confirmed</span></button></li>)}
        </ul>
      </aside>
      <section className="panel p-6 text-sm text-slate-300">
        <p>Each frame shows the detector's boxes. Keep the right ones, remove wrong ones, and drag to draw any it missed: every <b>ball</b> you can see and every <b>person</b>, including two players standing together as two boxes. Confirm when the frame is right; skip it if you cannot tell. Only frames you confirm train the next detector.</p>
        {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
      </section>
    </div>
  );

  const frame = set.frames[at];
  const presort = set.presort?.[String(frame.index)];
  const done = Object.values(labels.frames).filter(f => f.status === "confirmed").length;
  return (
    <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
      <aside className="panel max-h-[80vh] overflow-y-auto p-3" aria-label="Frames">
        <button type="button" onClick={() => { setSet(null); setLabels(null); }} className="text-sm text-slate-300 hover:text-white">‹ Label sets</button>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{set.match_title} · {done} of {set.frames.length} confirmed</p>
        <ul className="mt-2 grid gap-0.5">
          {set.frames.map((f, i) => {
            const status = labels.frames[String(f.index)]?.status;
            return <li key={f.index}><button type="button" onClick={() => go(i)} aria-current={i === at} className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${i === at ? "bg-[#287fb4] text-white" : "text-slate-300 hover:bg-white/5"}`}><span>{f.index}. {clock(f.time_s)} {REASON[f.reasons[0]] ?? ""}</span><span>{status === "confirmed" ? "✓" : status === "skipped" ? "–" : ""}</span></button></li>;
          })}
        </ul>
      </aside>
      <section className="grid gap-3">
        <div className="panel flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
          <span className="font-medium text-white">Frame {at + 1} of {set.frames.length} · {clock(frame.time_s)}</span>
          {frame.reasons.map(r => <span key={r} className="rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{REASON[r] ?? r}</span>)}
          {presort && <span className="text-xs text-amber-200">Assistant pre-sort: ball {presort.ball}{presort.note ? `, ${presort.note}` : ""} (check it)</span>}
        </div>
        <div className={`panel overflow-auto p-1 ${zoom ? "max-h-[75vh]" : ""}`}>
          <div className="relative" style={{ width: zoom ? "200%" : "100%" }}>
            <img src={`${BASE}/label-sets/${set.id}/${frame.image}`} alt={`Frame ${at + 1} of ${set.frames.length} at ${clock(frame.time_s)}`} className="block w-full select-none" draggable={false} />
            <svg ref={picture} className="absolute inset-0 h-full w-full cursor-crosshair touch-none" viewBox="0 0 1 1" preserveAspectRatio="none"
              onPointerDown={e => { drag.current = point(e); }} onPointerUp={end} aria-label="Drag to draw a box">
              {boxes.map((b, i) => { const n = boxes.slice(0, i + 1).filter(x => x.kind === b.kind).length; return <rect key={i} role="button" aria-label={`Remove ${b.kind} box ${n}`} x={b.box[0]} y={b.box[1]} width={b.box[2] - b.box[0]} height={b.box[3] - b.box[1]} fill="transparent" stroke={COLOUR[b.kind]} strokeWidth={2} vectorEffect="non-scaling-stroke" className="cursor-pointer hover:stroke-red-400"
                onPointerDown={e => e.stopPropagation()} onClick={() => setBoxes(all => all.filter((_, j) => j !== i))} />; })}
            </svg>
          </div>
        </div>
        <div className="panel flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
          <div role="group" aria-label="Box to draw" className="flex gap-1">
            {(["ball", "person"] as Kind[]).map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 ${kind === k ? "bg-[#287fb4] text-white" : "border border-white/15 text-slate-300"}`}>{k === "ball" ? "Ball (B)" : "Person (P)"}</button>)}
          </div>
          <button type="button" aria-pressed={zoom} onClick={() => setZoom(z => !z)} className="rounded-md border border-white/15 px-3 py-1.5 text-slate-300">Zoom (Z)</button>
          <span className="text-xs text-slate-400">{boxes.filter(b => b.kind === "ball").length} ball, {boxes.filter(b => b.kind === "person").length} people · click a box to remove it, drag to draw one</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => go(at - 1)} disabled={at === 0} className="rounded-md border border-white/15 px-3 py-1.5 text-slate-300 disabled:opacity-40">‹ Back</button>
            <button type="button" onClick={() => void decide("skipped")} disabled={saving} className="rounded-md border border-white/15 px-3 py-1.5 text-slate-300">Skip frame</button>
            <button type="button" onClick={() => void decide("confirmed")} disabled={saving} className="rounded-md bg-[#287fb4] px-4 py-1.5 font-medium text-white">Confirm frame</button>
          </span>
        </div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      </section>
    </div>
  );
}
