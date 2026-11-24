import { useState } from "react";
import { Button } from "../ui/Button";
import { clock } from "./labTypes";
import type { Corners, PitchKeyframe } from "./pitch";
import { BASE, csrfToken } from "./useLabData";

export const DEFAULT_CORNERS: Corners = [[0.05, 0.95], [0.95, 0.95], [0.8, 0.35], [0.2, 0.35]];

type Props = {
  jobId: string; sourceHash: string; hasCamera: boolean; marks: PitchKeyframe[]; at: number; marking: boolean;
  onQueued: (id: string) => void; onStart: () => void; onSave: () => void; onCancel: () => void; onDelete: (time: number) => void; onSeek: (time: number) => void;
  showOutline: boolean; setShowOutline: (on: boolean) => void;
};

/** Spec 600: mark the pitch being played on so only its people count; the outline follows the camera. */
export function PitchPanel(p: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
      <h2 className="font-semibold">Pitch outline</h2>
      {p.hasCamera && p.marks.length > 0 && <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={p.showOutline} onChange={e => p.setShowOutline(e.target.checked)} />Show pitch outline</label>}
    </div>
    {!p.hasCamera ? <>
      <p className="text-sm text-fg-muted">Mark the pitch your match is on so people on other pitches and along the sidelines are left out. First the lab works out how the camera moves (about 5 minutes for ten minutes of video); your labels carry over and this run is kept.</p>
      <Button disabled={busy} onClick={() => void prepare()}>{busy ? "Starting…" : "Prepare pitch outline"}</Button>
    </> : p.marking ? <>
      <p className="text-sm text-fg-muted">Drag the four green handles onto your pitch's corners. A corner off screen goes in the margin around the video, where it would be. Arrow keys nudge a selected handle.</p>
      <div className="flex gap-2"><Button variant="primary" onClick={p.onSave}>Save pitch mark</Button><Button onClick={p.onCancel}>Cancel</Button></div>
    </> : <>
      <p className="text-sm text-fg-muted">{p.marks.length ? "Only people inside the outline get rings, team suggestions and a say in which team made an action. If the outline drifts, pause there and mark again." : "Pause on a clear view of your pitch and mark its four corners. The outline then follows the camera."}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={p.marks.length ? undefined : "primary"} onClick={p.onStart}>Mark pitch here</Button>
        {p.marks.map(m => <span key={m.time_s} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs">
          <button className="tabular-nums hover:text-accent" onClick={() => p.onSeek(m.time_s)} aria-label={`Go to mark at ${clock(m.time_s)}`}>{clock(m.time_s)}</button>
          <button className="text-fg-muted hover:text-warn" onClick={() => p.onDelete(m.time_s)} aria-label={`Delete mark at ${clock(m.time_s)}`}>×</button>
        </span>)}
      </div>
    </>}
    {error && <p role="alert" className="text-sm text-warn">{error}</p>}
  </section>;
}
