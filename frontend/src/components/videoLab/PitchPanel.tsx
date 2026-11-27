import { useState } from "react";
import { Button } from "../ui/Button";
import { clock } from "./labTypes";
import { CORNER_NAMES, EXTRA_POINTS, type Landmark } from "./landmarks";
import type { PitchKeyframe } from "./pitch";
import { BASE, csrfToken } from "./useLabData";

export { DEFAULT_CORNERS } from "./landmarks";

type Props = {
  jobId: string; sourceHash: string; hasCamera: boolean; marks: PitchKeyframe[]; at: number; marking: boolean;
  onQueued: (id: string) => void; onStart: () => void; onSave: () => void; onCancel: () => void; onDelete: (time: number) => void; onSeek: (time: number) => void;
  cornerIndices?: number[]; onCornerIndices?: (indices: number[]) => void; canSave?: boolean;
  landmarks?: Landmark[]; onAddPoint?: (name: string) => void;
  showOutline: boolean; setShowOutline: (on: boolean) => void;
  /** Spec 800: the run has registered camera poses, so marks become reference points that follow pan and zoom. */
  onVideo?: boolean;
};

/** Spec 600: mark the pitch being played on so only its people count; the outline follows the camera. */
export function PitchPanel(p: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [point, setPoint] = useState(EXTRA_POINTS[0].name);
  async function prepare() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${BASE}/jobs/${p.jobId}/track-camera`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify({ source_sha256: p.sourceHash }) });
      if (!response.ok) throw new Error(response.status === 409 ? "Another analysis is running, or the video changed. Try again when it finishes." : "Pitch outline could not be prepared.");
      p.onQueued((await response.json() as { id: string }).id);
    } catch (e) { setError(e instanceof Error ? e.message : "Pitch outline could not be prepared."); }
    finally { setBusy(false); }
  }
  return <section className="panel space-y-3 p-3" aria-label="Pitch outline">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="font-semibold">Pitch calibration and tracking</h2>
      {p.hasCamera && p.marks.length > 0 && <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={p.showOutline} onChange={e => p.setShowOutline(e.target.checked)} />Show pitch outline</label>}
    </div>
    {!p.hasCamera ? <>
      <p className="text-sm text-fg-muted">Prepare automatic boundary suggestions and camera motion for this clip. You can then adjust the outline with extra points. Your labels carry over and this run is kept.</p>
      <Button disabled={busy} onClick={() => void prepare()}>{busy ? "Starting…" : "Prepare pitch outline"}</Button>
    </> : p.marking ? <>
      {p.onVideo ? <p className="text-sm text-fg-muted">Drag the green corners onto the pitch corners and the amber handles onto the ends of the halfway line, on the paused frame. Untick any corner you cannot see. When you save, these become reference points on the ground: the box and halfway line follow the camera as it pans and zooms. Where they drift later in the game, pause there and mark again; each mark is exact at its moment and the pitch blends between marks. Arrow keys nudge handles.</p>
      : <p className="text-sm text-fg-muted">Drag the green corners onto the pitch. Add visible known points such as the halfway-line intersections, then drag their blue handles to those exact markings. Add another calibration at a different camera angle; corrections are blended within the same camera shot. Arrow keys nudge handles.</p>}
      <div className="flex flex-wrap items-center gap-2"><label className="text-sm">Extra pitch point<select aria-label="Extra pitch point" className="ml-2 rounded border border-line bg-ink-900 p-1" value={point} onChange={e => setPoint(e.target.value)}>{EXTRA_POINTS.map(v => <option key={v.name} disabled={p.landmarks?.some(l=>l.name===v.name)}>{v.name}</option>)}</select></label><Button disabled={p.landmarks?.some(l=>l.name===point)} onClick={()=>p.onAddPoint?.(point)}>Add calibration point</Button></div>
      <fieldset className="flex flex-wrap gap-2 text-xs"><legend className="mb-1 text-fg-muted">Use corners in fit — untick guessed or off-screen corners</legend>{CORNER_NAMES.map((name,i)=><label key={name} className="flex items-center gap-1"><input type="checkbox" checked={p.cornerIndices?.includes(i) ?? true} onChange={e=>p.onCornerIndices?.(e.target.checked?[...(p.cornerIndices ?? []),i].sort():(p.cornerIndices ?? []).filter(n=>n!==i))}/>{name}</label>)}</fieldset>
      {p.canSave===false && <p className="text-xs text-warn">Use at least four non-collinear known points. Add visible halfway-line intersections or other pitch markings.</p>}
      <div className="flex gap-2"><Button variant="primary" disabled={p.canSave===false} onClick={p.onSave}>Save pitch mark</Button><Button onClick={p.onCancel}>Cancel</Button></div>
    </> : <>
      <p className="text-sm text-fg-muted">{p.onVideo ? (p.marks.length ? "Your pitch marks place the box and halfway line. If they drift, pause there and mark again." : "To correct the box or halfway line on the video, pause where they are wrong and mark the pitch there.") : p.marks.length ? "Only people inside the outline get rings, team suggestions and a say in which team made an action. If the outline drifts, pause there and mark again." : "Use the boundary editor above for the playing area. For positions in metres, pause on visible known pitch markings and calibrate below."}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={p.marks.length ? undefined : "primary"} onClick={p.onStart}>Mark pitch here</Button>
        <Button disabled={busy} onClick={()=>void prepare()}>{busy ? "Starting…" : "Update camera tracking"}</Button>
        {p.marks.map(m => <span key={m.time_s} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs">
          <button className="tabular-nums hover:text-accent" onClick={() => p.onSeek(m.time_s)} aria-label={`Go to mark at ${clock(m.time_s)}`}>{clock(m.time_s)}</button>
          <button className="text-fg-muted hover:text-warn" onClick={() => p.onDelete(m.time_s)} aria-label={`Delete mark at ${clock(m.time_s)}`}>×</button>
        </span>)}
      </div>
    </>}
    {error && <p role="alert" className="text-sm text-warn">{error}</p>}
  </section>;
}
