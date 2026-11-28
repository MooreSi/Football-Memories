import { useState } from "react";
import { Button } from "../ui/Button";
import { BASE, csrfToken } from "./useLabData";

type Run = { id: string; state: string; parent_job_id?: string };
type Result = { deleted: string[]; kept_labels: string[]; freed_bytes: number };

/** Every run made from `id` (stitched pitch, shirt numbers, grouping...), however deep. */
export function derivedRuns(id: string, runs: Run[]): string[] {
  const found: string[] = [];
  let frontier = [id];
  while (frontier.length) {
    frontier = runs.filter(r => r.parent_job_id && frontier.includes(r.parent_job_id) && !found.includes(r.id)).map(r => r.id);
    found.push(...frontier);
  }
  return found;
}

const size = (bytes: number) => bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;

/**
 * Delete a run and the runs made from it (owner request, 28 November 2026). The gateway keeps the
 * runs' saved labels and never touches the Training stores; this only asks first and reports.
 */
export function DeleteRun({ run, runs, name, onDeleted }: { run: Run; runs: Run[]; name: string; onDeleted: (ids: string[]) => void }) {
  const [asking, setAsking] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [done, setDone] = useState("");
  const derived = derivedRuns(run.id, runs).length;
  const finished = run.state === "complete" || run.state === "failed";
  async function remove() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${BASE}/jobs/${run.id}`, { method: "DELETE", credentials: "same-origin", headers: { "X-CSRF-Token": await csrfToken() } });
      const body = await response.json().catch(() => ({})) as Partial<Result> & { detail?: unknown };
      if (!response.ok) throw new Error(typeof body.detail === "string" ? body.detail : "The run could not be deleted.");
      const deleted = body.deleted ?? [run.id];
      setDone(`Deleted ${deleted.length} run${deleted.length === 1 ? "" : "s"} and freed ${size(body.freed_bytes ?? 0)}.${body.kept_labels?.length ? " Saved labels kept for training." : ""}`);
      setAsking(false);
      onDeleted(deleted);
    } catch (e) { setError(e instanceof Error ? e.message : "The run could not be deleted."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    {!asking && <Button disabled={!finished} title={finished ? undefined : "Wait for this run to finish"} onClick={() => { setAsking(true); setDone(""); setError(""); }}>Delete this run</Button>}
    {asking && <div role="alertdialog" aria-label="Delete this run?" className="space-y-2 rounded-lg border border-warn/50 bg-warn/5 p-3 text-sm">
      <p className="font-semibold">Delete {name}{derived ? ` and the ${derived} run${derived === 1 ? "" : "s"} made from it` : ""}?</p>
      <p className="text-fg-muted">This removes their analysed videos and results from the Mac to free space. It cannot be undone. The source clip stays, so the match can be analysed again.</p>
      <p className="text-fg-muted">Labels you saved on these runs are kept for training. Training ball crops, label sets and trained models are not touched.</p>
      <div className="flex flex-wrap gap-2"><Button disabled={busy} className="border-warn/60 text-warn" onClick={() => void remove()}>{busy ? "Deleting…" : "Delete permanently"}</Button><Button variant="ghost" disabled={busy} onClick={() => setAsking(false)}>Cancel</Button></div>
    </div>}
    {error && <p role="alert" className="text-sm text-warn">{error}</p>}
    {done && <p role="status" className="text-sm text-fg-muted">{done}</p>}
  </div>;
}
