import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

const BASE = "http://127.0.0.1:8766";
const KEY = ["hudl-desktop-helper"];
type Status = { state: string; message: string; filename: string | null };
const active = (state?: string) => !!state && !["idle", "done", "error"].includes(state);

export function HudlCapture() {
  const client = useQueryClient();
  const [url, setUrl] = useState("");
  const [players, setPlayers] = useState("");
  const [height, setHeight] = useState("65536");
  const [validation, setValidation] = useState("");
  const q = useQuery<Status>({
    queryKey: KEY, retry: false,
    queryFn: async () => {
      const response = await fetch(`${BASE}/status`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error("Desktop helper is not running.");
      return response.json();
    },
    refetchInterval: (query) => active(query.state.data?.state) ? 1500 : false,
  });
  const capture = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${BASE}/capture`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), max_height: Number(height),
          player_codes: players.split(";").map(p => p.trim()).filter(Boolean) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Could not start capture.");
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
  const busy = capture.isPending || active(q.data?.state);
  function submit(event: FormEvent) {
    event.preventDefault();
    setValidation("");
    if (!/^https:\/\/(?:www\.)?hudl\.com\/watch\/video\/[A-Za-z0-9_=+-]+(?:\/explore\/sportscode)?\/?$/.test(url.trim())) {
      setValidation("Use the match page URL, without login state or query parameters.");
      return;
    }
    capture.mutate();
  }
  const inputClass = "mt-1 w-full rounded-lg border border-line bg-ink-950/60 px-3 py-2 text-sm text-fg focus:outline-2 focus:outline-accent disabled:opacity-50";
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <h3 className="text-sm font-semibold">Capture from Hudl</h3>
      <p className="text-xs text-fg-muted">
        Open a match in Hudl and copy its page address. Capture opens a separate browser for
        your sign-in, saves the video and Sportscode moments, and prepares them for Import.
      </p>
      {q.isError ? (
        <div className="space-y-2 text-xs text-fg-muted">
          <p>Start the desktop helper on this computer, then check again.</p>
          <details>
            <summary className="cursor-pointer text-accent">Desktop helper setup</summary>
            <p className="mt-2">From the project’s backend folder, with Chrome and ffmpeg installed:</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-ink-950 p-2">uv run python -m app.connectors.hudl_companion --output ../data/inbox</code>
            <p className="mt-2">Use your configured inbox folder if it differs. Keep this helper running while capturing.</p>
          </details>
          <Button onClick={() => void q.refetch()}>Check desktop helper</Button>
        </div>
      ) : q.isPending ? <p className="text-xs text-fg-muted">Checking desktop helper…</p> : (
        <>
          <p className={`text-xs ${q.data.state === "error" ? "text-danger" : "text-fg-muted"}`} role="status" aria-live="polite">{q.data.message}</p>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-xs text-fg-muted">
              Match URL
              <input aria-label="Match URL" type="url" required value={url} onChange={e => setUrl(e.target.value)} disabled={busy} className={inputClass} placeholder="https://www.hudl.com/watch/video/…" />
            </label>
            <label className="block text-xs text-fg-muted">
              Maximum quality
              <select aria-label="Maximum quality" value={height} onChange={e => setHeight(e.target.value)} disabled={busy} className={inputClass}>
                <option value="65536">Highest available (original quality)</option>
                {[540, 720, 1080, 2160].map(value => <option key={value} value={value}>{value}p</option>)}
              </select>
            </label>
            <label className="block text-xs text-fg-muted">
              Player codes (optional)
              <input aria-label="Player codes (optional)" value={players} onChange={e => setPlayers(e.target.value)} disabled={busy} className={inputClass} placeholder="Exact Hudl labels, separated by semicolons" />
            </label>
            <p className="text-xs text-fg-subtle">Enter the exact Sportscode labels that represent players. Other labels remain event categories.</p>
            {(validation || capture.isError) && <p role="alert" className="text-xs text-danger">{validation || (capture.error as Error)?.message}</p>}
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Capture in progress…" : "Capture match"}</Button>
          </form>
          {q.data.state === "done" && q.data.filename && (
            <Link to="/import" className="inline-flex text-sm font-semibold text-accent underline">Import captured match</Link>
          )}
        </>
      )}
    </div>
  );
}
