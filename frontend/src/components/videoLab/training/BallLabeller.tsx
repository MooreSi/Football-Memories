import { useCallback, useEffect, useState } from "react";
import { Button } from "../../ui/Button";
import { BASE } from "../useLabData";
import { clock } from "../labTypes";
import { LABELS, send, type BallLabels, type BallSet, type Choice } from "./trainingApi";

/** One crop at a time, large, with the box outlined; a choice saves and moves to the next. */
export function BallLabeller({ set, labels, onSaved, onClose }: { set: BallSet; labels: BallLabels; onSaved: (labels: BallLabels) => void; onClose: () => void }) {
  const firstOpen = Math.max(0, set.items.findIndex(i => !labels.items[String(i.index)]));
  const [at, setAt] = useState(firstOpen);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const item = set.items[at];
  const done = set.items.every(i => labels.items[String(i.index)]);

  const choose = useCallback(async (label: Choice) => {
    if (!item || saving) return;
    const items = { ...labels.items, [String(item.index)]: { label } };
    setSaving(true);
    try {
      const saved = await send<BallLabels>("PUT", `/ball-sets/${set.id}/labels`, { revision: labels.revision, source_sha256: set.source_sha256, items }, "This crop could not be saved. Try again or reload.");
      onSaved({ revision: saved.revision, source_sha256: saved.source_sha256, items });
      setError("");
      const next = set.items.findIndex((i, n) => n > at && !items[String(i.index)]);
      if (next >= 0) setAt(next); else if (at + 1 < set.items.length) setAt(at + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "This crop could not be saved."); }
    finally { setSaving(false); }
  }, [item, saving, labels, set, at, onSaved]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,select,textarea")) return;
      const hit = LABELS.find(l => l.hotkey === e.key);
      if (hit) { e.preventDefault(); void choose(hit.key); }
      else if (e.key === "ArrowRight") setAt(a => Math.min(set.items.length - 1, a + 1));
      else if (e.key === "ArrowLeft") setAt(a => Math.max(0, a - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [choose, set.items.length]);

  const current = item ? labels.items[String(item.index)]?.label : undefined;
  const count = Object.keys(labels.items).length;
  return <section className="panel space-y-3 p-4" aria-label="Label ball crops">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-semibold">{set.match_title ?? "Ball crops"}</h3>
      <span className="text-sm tabular-nums text-fg-muted">{count} of {set.items.length} labelled</span>
      <Button variant="ghost" className="ml-auto" onClick={onClose}>Back to sets</Button>
    </div>
    {done && <p role="status" className="text-sm text-accent">All {set.items.length} crops labelled. Change any by going back to it.</p>}
    {item && <div className="grid items-start gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
      <figure className="space-y-1">
        <img src={`${BASE}/ball-sets/${set.id}/${item.image}`} alt={`Crop ${at + 1} of ${set.items.length}: what the detector called a ball at ${clock(item.time_s)}`}
          className="aspect-square w-full rounded-lg bg-black object-contain [image-rendering:pixelated]" />
        <figcaption className="flex justify-between text-xs text-fg-muted"><span>Crop {at + 1} of {set.items.length} · {clock(item.time_s)}</span>
          <span>{item.score !== null ? `detector ${Math.round(item.score * 100)}%` : ""}{current ? ` · ${LABELS.find(l => l.key === current)?.label}` : ""}</span></figcaption>
      </figure>
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">What is inside the yellow box? Your answer trains the ball model; only the ball in play is a match ball.</p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="What is it">
          {LABELS.map(l => <Button key={l.key} disabled={saving} aria-pressed={current === l.key} onClick={() => void choose(l.key)}
            className={current === l.key ? "border-accent" : ""}>{l.label} <kbd className="text-[10px] opacity-60">{l.hotkey}</kbd></Button>)}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>Previous</Button>
          <Button variant="ghost" disabled={at + 1 >= set.items.length} onClick={() => setAt(at + 1)}>Next</Button>
        </div>
        {error && <p role="alert" className="text-sm text-warn">{error}</p>}
        <p className="text-xs text-fg-muted">Keys: 1 match ball · 2 spare ball · 3 cone · 4 person · 5 something else · 0 not sure · arrows move.</p>
      </div>
    </div>}
  </section>;
}
