import { useState } from "react";
import { Button } from "../ui/Button";
import { BASE, csrfToken } from "./useLabData";

/** Queue a new run that reads shirt numbers from many views of each player; labels carry over. */
export function ReadShirtNumbers({ jobId, sourceHash, again, onQueued }: { jobId: string; sourceHash: string; again: boolean; onQueued: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${BASE}/jobs/${jobId}/read-shirt-numbers`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify({ source_sha256: sourceHash }) });
      if (!response.ok) throw new Error(response.status === 409 ? "Another analysis is running, or the video changed. Try again when it finishes." : "Reading shirt numbers could not be started.");
      onQueued((await response.json() as { id: string }).id);
    } catch (e) { setError(e instanceof Error ? e.message : "Reading shirt numbers could not be started."); }
    finally { setBusy(false); }
  }
  return <section className="panel flex flex-wrap items-center gap-3 p-3" aria-label="Shirt numbers">
    <p className="min-w-0 flex-1 text-sm text-fg-muted"><strong className="text-fg">{again ? "Read shirt numbers again." : "Shirt numbers on the pitch."}</strong> Reads each player's number from many views of their back. Takes about 3 minutes per 4 minutes of video in a new run; your labels and corrections carry over. Numbers it is unsure of are left blank, and you can correct any of them.</p>
    <Button disabled={busy} onClick={() => void start()}>{busy ? "Starting…" : "Read shirt numbers"}</Button>
    {error && <p role="alert" className="w-full text-sm text-warn">{error}</p>}
  </section>;
}
