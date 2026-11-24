import { useState } from "react";
import { Button } from "../ui/Button";
import { BASE, csrfToken } from "./useLabData";

/** Queue a new run that finds people about ten times a second inside each moment's clip. */
export function RefineMoments({ jobId, sourceHash, onQueued }: { jobId: string; sourceHash: string; onQueued: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function refine() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${BASE}/jobs/${jobId}/refine-moments`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify({ source_sha256: sourceHash }) });
      if (!response.ok) throw new Error(response.status === 409 ? "Another analysis is running, or the video changed. Try again when it finishes." : "Refining could not be started.");
      onQueued((await response.json() as { id: string }).id);
    } catch (e) { setError(e instanceof Error ? e.message : "Refining could not be started."); }
    finally { setBusy(false); }
  }
  return <section className="panel flex flex-wrap items-center gap-3 p-3" aria-label="Refine moments">
    <p className="min-w-0 flex-1 text-sm text-fg-muted"><strong className="text-fg">Sharper tracking around moments.</strong> Finds players about ten times a second during each moment's clip instead of three, so rings stay on their feet. Takes roughly 25 minutes for a ten-minute match; your labels carry over and this run is kept.</p>
    <Button disabled={busy} onClick={() => void refine()}>{busy ? "Starting…" : "Refine moments"}</Button>
    {error && <p role="alert" className="w-full text-sm text-warn">{error}</p>}
  </section>;
}
