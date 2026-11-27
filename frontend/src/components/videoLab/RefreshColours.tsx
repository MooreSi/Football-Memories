import { useState } from "react";
import { Button } from "../ui/Button";
import { kitColour, type KitPrototype } from "./kits";
import { BASE, csrfToken } from "./useLabData";

/**
 * Re-read every player's shirt colour with the current worker in a new run; tracks, pitch and your
 * labels carry over (gateway team-calibration, worker team-enrichment). 27 November 2026: the worker
 * now reads thin dark shirts it used to lose to the grass (261108 Stoke: 7217 samples without colour
 * became 207), so older runs gain teams by updating.
 */
export function RefreshColours({ jobId, sourceHash, kits, onQueued }: { jobId: string; sourceHash: string; kits: KitPrototype[]; onQueued: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const own = kits.find(k => k.team === "own" && k.role === "player"), opponent = kits.find(k => k.team === "opponent" && k.role === "player");
  const ownHex = own && kitColour(own.lab), opponentHex = opponent && kitColour(opponent.lab);
  const ready = !!ownHex && !!opponentHex && ownHex !== opponentHex;
  async function start() {
    if (!ready) return;
    setBusy(true); setError("");
    try {
      const body = { source_sha256: sourceHash, kits: [{ id: "own", label: "Our team", colour_hex: ownHex }, { id: "opponent", label: "Opponent", colour_hex: opponentHex }] };
      const response = await fetch(`${BASE}/jobs/${jobId}/team-calibration`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(response.status === 409 ? "Another analysis is running, or the video changed. Try again when it finishes." : "Updating shirt colours could not be started.");
      onQueued((await response.json() as { id: string }).id);
    } catch (e) { setError(e instanceof Error ? e.message : "Updating shirt colours could not be started."); }
    finally { setBusy(false); }
  }
  return <section className="panel flex flex-wrap items-center gap-3 p-3" aria-label="Shirt colours">
    <p className="min-w-0 flex-1 text-sm text-fg-muted"><strong className="text-fg">Shirt colours.</strong> Reads every player's shirt colour again with the latest analysis, in a new run of about a minute; tracks, the pitch and your labels carry over. Runs made before 27 November lose thin dark shirts on dark artificial grass.{!ready && " Label one player from each team first."}</p>
    <Button disabled={busy || !ready} onClick={() => void start()}>{busy ? "Starting…" : "Update shirt colours"}</Button>
    {error && <p role="alert" className="w-full text-sm text-warn">{error}</p>}
  </section>;
}
