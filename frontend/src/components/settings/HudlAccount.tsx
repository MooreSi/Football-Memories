import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type Hls from "hls.js";
import { Download, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

const BASE = "http://127.0.0.1:8766";
const KEY = ["hudl-account"];
type Match = { id: string; title: string; url: string };
type Status = { session_active?: boolean; configured: boolean; busy: boolean; state: string; message: string;
  matches: Match[]; stream_url?: string | null; filename?: string | null };
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Hudl request failed.");
  return data;
}

export function StreamPlayer({ url, seek }: { url: string; seek?: {time:number; nonce:number} }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    setError("");
    if (element.canPlayType("application/vnd.apple.mpegurl")) {
      element.src = url;
      return () => { element.removeAttribute("src"); element.load(); };
    }
    let disposed = false;
    let player: Hls | undefined;
    void import("hls.js/light").then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) { setError("This browser does not support this stream."); return; }
      player = new Hls({ maxBufferLength: 20, maxMaxBufferLength: 30,
        manifestLoadingMaxRetry: 0, levelLoadingMaxRetry: 0, fragLoadingMaxRetry: 0 });
      player.loadSource(url);
      player.attachMedia(element);
      player.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) { setError("Stream stopped. Test the connection and select Stream again."); player?.destroy(); }
      });
    }).catch(() => { if (!disposed) setError("The streaming player could not load. Refresh the app."); });
    return () => { disposed = true; player?.destroy(); };
  }, [url]);
  useEffect(() => {
    const element=video.current;if(!element||!seek)return;
    const play=()=>{element.currentTime=seek.time;void element.play().catch(()=>undefined);};
    if(element.readyState)play();else element.addEventListener("loadedmetadata",play,{once:true});
    return ()=>element.removeEventListener("loadedmetadata",play);
  },[seek]);
  return <div className="space-y-2">
    <video ref={video} crossOrigin="anonymous" controls playsInline preload="none"
      aria-label="Hudl match stream" className="aspect-video w-full rounded-xl bg-black" />
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}

export function HudlAccount({ onConnectionChange }: { onConnectionChange?: (state: string | null) => void }) {
  const client = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState("");
  const q = useQuery<Status>({ queryKey: KEY, queryFn: () => request("/account"), retry: false,
    refetchInterval: data => data.state.data?.busy ? 1500 : false });
  useEffect(() => {
    onConnectionChange?.(!q.data ? null : q.data.busy ? "Working…"
      : q.data.state === "error" ? "Needs attention" : !q.data.configured ? "Not connected"
      : ["ready", "done"].includes(q.data.state) ? "Connected" : "Credentials saved");
  }, [q.data, onConnectionChange]);
  const save = useMutation({ mutationFn: () => request("/account/credentials", { username, password }),
    onSuccess: () => { setPassword(""); setSaved(true); void client.invalidateQueries({ queryKey: KEY }); } });
  const action = useMutation({ mutationFn: (body: { action: string; match_id?: string }) => request("/account/action", body),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
  if (q.isError) return null; // The existing capture section provides desktop-helper setup.
  if (q.isPending) return <p className="text-xs text-fg-muted">Checking saved Hudl connection…</p>;
  const busy = q.data.busy || save.isPending || action.isPending;
  const matches = q.data.matches.filter(m => m.title.toLowerCase().includes(filter.toLowerCase()));
  function submit(event: FormEvent) { event.preventDefault(); setSaved(false); save.mutate(); }
  return <section aria-label="Hudl account connection" className="space-y-4 border-t border-line pt-4">
    <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={17} /> Your Hudl account</div>
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1 text-sm"><span>Hudl username</span>
        <input aria-label="Hudl username" type="email" autoComplete="username" required disabled={busy}
          className="field" value={username} onChange={e => setUsername(e.target.value)} placeholder="Email address" /></label>
      <label className="block space-y-1 text-sm"><span>Hudl password</span>
        <input aria-label="Hudl password" type="password" autoComplete="off" required disabled={busy}
          className="field" value={password} onChange={e => setPassword(e.target.value)}
          placeholder={q.data.configured ? "Saved in Keychain — enter to replace" : "Password"} /></label>
      <p className="text-xs text-fg-subtle">Saved only in this Mac’s Keychain. Test signs in and refreshes available matches. Complete any verification in the Hudl browser.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={busy}>{save.isPending ? "Saving…" : "Save"}</Button>
        <Button type="button" disabled={busy || !q.data.configured} onClick={() => action.mutate({ action: "test" })}>Test</Button>
        <Button type="button" disabled={busy || !q.data.configured} onClick={() => action.mutate({ action: "refresh" })}><RefreshCw size={14} /> Refresh matches</Button>
        {q.data.session_active && <Button type="button" disabled={busy} onClick={() => action.mutate({ action: "disconnect" })}>Disconnect</Button>}
      </div>
    </form>
    {saved && <p className="text-xs text-ok" role="status">Saved in this Mac’s Keychain. Select Test to connect.</p>}
    <p role="status" className={`text-xs ${q.data.state === "error" ? "text-danger" : "text-fg-muted"}`}>{q.data.message}</p>
    {(save.isError || action.isError) && <p role="alert" className="text-sm text-danger">{(save.error ?? action.error)?.message}</p>}
    {q.data.stream_url && <StreamPlayer url={q.data.stream_url} />}
    {q.data.filename && <Link to="/import" className="inline-flex text-sm font-semibold text-accent underline">Import downloaded match</Link>}
    {q.data.matches.length > 0 && <div className="space-y-3">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Available matches</h3><span className="text-xs text-fg-subtle">{q.data.matches.length} cached</span></div>
      <input aria-label="Search Hudl matches" className="field" placeholder="Search matches…" value={filter} onChange={e => setFilter(e.target.value)} />
      <ul className="max-h-[440px] space-y-2 overflow-y-auto" aria-label="Available Hudl matches">
        {matches.map(m => <li key={m.id} className="tile space-y-3 p-3">
          <p className="text-sm font-medium">{m.title}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} aria-label={`Stream ${m.title}`} onClick={() => action.mutate({ action: "stream", match_id: m.id })}><Play size={14} /> Stream</Button>
            <Button disabled={busy} aria-label={`Download ${m.title}`} onClick={() => action.mutate({ action: "download", match_id: m.id })}><Download size={14} /> Download</Button>
          </div>
        </li>)}
      </ul>
    </div>}
  </section>;
}
