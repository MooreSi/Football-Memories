import { useEffect, useState } from "react";
import { Button } from "./ui/Button";

type Candidate = { id: string; type: Action; time_s: number; score: number; source_label?: string };
type Jersey = { track_id: number; number: number };
type Action = "goal" | "pass" | "tackle";
type Track = { track_id: number; start_s: number; end_s: number };
type Identity = Track & { player_id: string };
type ReviewedEvent = { id: string; type: Action; time_s: number; track_id: number | null; confirmed: boolean };
type Review = { revision: number; source_sha256: string; events: ReviewedEvent[]; identities: Identity[]; reviewed_intervals: [number, number][]; review_complete: boolean };
const BASE = "/_admin/api/video-analytics/jobs/";
const inputClass = "w-full rounded-lg border border-line bg-ink-900 p-2 text-sm";

export function VideoReviewPanel({ jobId, at, onSeek, hasSuggestions=false, hasJerseys=false }: { jobId: string; at: number; onSeek: (time: number) => void; hasSuggestions?: boolean; hasJerseys?: boolean }) {
  const [review, setReview] = useState<Review | null>(null);
  const [suggestions,setSuggestions]=useState<Candidate[]>([]);
  const [jerseys,setJerseys]=useState<Jersey[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [actor, setActor] = useState("");
  const [player, setPlayer] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let live = true;
    setReview(null); setError(""); setSaved(false); setActor(""); setPlayer("");
    void Promise.all(["review", "review-tracks", ...(hasSuggestions?["files/event_suggestions.json"]:[]), ...(hasJerseys?["files/jersey_candidates.json"]:[])].map(async suffix => {
      const response = await fetch(`${BASE}${jobId}/${suffix}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error("Review unavailable. Reload after analysis completes.");
      return response.json() as Promise<unknown>;
    })).then(([labels, observed, ...extra]) => {
      const data = labels as Review;
      if (!Array.isArray(data.events) || !Array.isArray(observed)) throw new Error("Review unavailable. Reload the page.");
      if (live) {
        setReview(data); setTracks(observed as Track[]);
        const candidates=hasSuggestions?extra.shift():[];
        const numbers=hasJerseys?extra.shift():[];
        setSuggestions(Array.isArray(candidates)?candidates.filter((e: Candidate)=>["goal","pass","tackle"].includes(e.type)&&Number.isFinite(e.time_s)&&Number.isFinite(e.score)).map((e: Candidate)=>({...e,id:e.id||`model-${e.type}-${e.time_s}`})):[]);
        setJerseys(Array.isArray(numbers)?numbers as Jersey[]:[]);
      }
    }).catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : "Review unavailable."); });
    return () => { live = false; };
  }, [jobId,hasSuggestions,hasJerseys]);
  function change(next: Review) { setReview(next); setSaved(false); setError(""); }
  function add(type: Action) {
    if (!review) return;
    change({ ...review, events: [...review.events, { id: crypto.randomUUID(), type, time_s: Math.round(at * 1000) / 1000, track_id: actor ? Number(actor) : null, confirmed: true }] });
  }
  async function save() {
    if (!review) return;
    setSaving(true); setSaved(false); setError("");
    try {
      const identity = await fetch("/_portal/api/me", { credentials: "same-origin", cache: "no-store" });
      if (!identity.ok) throw new Error("Please sign in again.");
      const me = await identity.json() as { csrf_token: string };
      const body: Review = {
        revision: review.revision, source_sha256: review.source_sha256,
        events: review.events.map(({ id, type, time_s, track_id, confirmed }) => ({ id, type, time_s, track_id, confirmed })),
        identities: review.identities.map(({ track_id, player_id, start_s, end_s }) => ({ track_id, player_id, start_s, end_s })),
        reviewed_intervals: review.reviewed_intervals, review_complete: review.review_complete,
      };
      const response = await fetch(`${BASE}${jobId}/review`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": me.csrf_token }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error(response.status === 409 ? "Review changed in another window. Reload before saving." : "Review could not be saved. Check event times and track intervals.");
      const result = await response.json() as Review;
      setReview({ ...body, ...result }); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Review could not be saved."); }
    finally { setSaving(false); }
  }
  const visible = tracks.filter(t => t.start_s <= at && t.end_s >= at);
  return <section className="panel space-y-4 p-5" aria-label="Football action review">
    <h2 className="font-semibold">Review actions and players</h2>
    <p className="text-sm leading-relaxed text-fg-muted">Watch the incident, pause at the action and record what you can verify. Your labels train the action model; an unlabelled interval stays unknown. Player attribution applies only to the track interval you identify.</p>
    {error && <p role="alert" className="text-sm text-warn">{error}</p>}
    {review && <>
      <p className="text-sm">Current sample time: {at.toFixed(2)} seconds · Revision {review.revision}</p>
      <label className="block text-sm">Actor track<select className={inputClass} value={actor} onChange={e => {setActor(e.target.value);const t=tracks.find(row=>row.track_id===Number(e.target.value));if(t){setStart(t.start_s);setEnd(t.end_s);}}}><option value="">Unknown / team event</option>{visible.map(t => <option key={t.track_id} value={t.track_id}>Track {t.track_id}{jerseys.some(j=>j.track_id===t.track_id)?` · jersey hint #${jerseys.find(j=>j.track_id===t.track_id)!.number}`:""} · {t.start_s.toFixed(1)}–{t.end_s.toFixed(1)}s</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{(["goal", "pass", "tackle"] as const).map(type => <Button key={type} onClick={() => add(type)} aria-label={`Add ${type} at current time`}>Add {type}</Button>)}</div>
      {suggestions.length>0&&<div className="space-y-3 rounded-lg border border-line p-3"><h3 className="text-sm font-semibold">Model suggestions · awaiting review</h3><p className="text-xs text-fg-muted">Seek to an incident and watch it before confirming. Model scores are uncalibrated; actor identity stays unknown until you assign it. A successful tackle label is narrower than a tackle attempt.</p>{suggestions.map(e=><div key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><button className="text-left text-accent" onClick={()=>onSeek(e.time_s)}>{e.type} · {e.time_s.toFixed(2)}s · model score {e.score.toFixed(2)}{e.source_label?` · ${e.source_label}`:""}</button><Button aria-label={`Confirm ${e.type} suggestion at ${e.time_s.toFixed(2)}s`} disabled={review.events.some(row=>row.id===e.id)} onClick={()=>{const selected=tracks.find(t=>t.track_id===Number(actor)&&t.start_s<=e.time_s&&t.end_s>=e.time_s);change({...review,events:[...review.events,{id:e.id,type:e.type,time_s:e.time_s,track_id:selected?.track_id??null,confirmed:true}]});}}>Confirm after watching</Button></div>)}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Player label<input className={inputClass} maxLength={100} value={player} onChange={e => setPlayer(e.target.value)} placeholder="Verified player name or roster ID" /></label>
        <label className="text-sm">Identity starts (seconds)<input className={inputClass} type="number" min={0} max={600.1} step={.1} value={start} onChange={e => setStart(Number(e.target.value))} /></label>
        <label className="text-sm">Identity ends (seconds)<input className={inputClass} type="number" min={0} max={600.1} step={.1} value={end} onChange={e => setEnd(Number(e.target.value))} /></label>
      </div>
      <Button disabled={!actor || !player.trim() || end <= start} onClick={() => change({ ...review, identities: [...review.identities, { track_id: Number(actor), player_id: player.trim(), start_s: start, end_s: end }] })}>Assign verified player</Button>
      {review.identities.map((i, index) => <div key={index} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0 break-all">Track {i.track_id} → {i.player_id} · {i.start_s}–{i.end_s}s</span><button onClick={() => change({ ...review, identities: review.identities.filter((_, n) => n !== index) })} className="text-fg-muted underline">Remove identity {index + 1}</button></div>)}
      <div className="space-y-2">{review.events.map(e => <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm"><button onClick={() => onSeek(e.time_s)}>{e.type} · {e.time_s.toFixed(2)}s · {e.track_id ? `Track ${e.track_id}` : "Unknown actor"}</button><button onClick={() => change({ ...review, events: review.events.filter(row => row.id !== e.id) })} className="text-fg-muted underline">Remove {e.type} at {e.time_s.toFixed(2)}s</button></div>)}</div>
      <fieldset className="space-y-3 rounded-lg border border-line p-3"><legend className="px-1 text-sm">Complete interval review</legend><p className="text-xs text-fg-muted">Use the start/end fields above for an interval you have watched for all goals, passes and tackles. This also establishes background examples.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={complete} onChange={e => setComplete(e.target.checked)} />I checked every requested action in this interval</label><Button disabled={!complete || end <= start} onClick={() => { change({ ...review, reviewed_intervals: [...review.reviewed_intervals, [start, end]], review_complete: true }); setComplete(false); }}>Mark interval reviewed</Button>{review.reviewed_intervals.map(([a, b], i) => <p className="text-sm" key={i}>{a}–{b}s reviewed <button className="ml-2 underline" onClick={() => { const remaining = review.reviewed_intervals.filter((_, n) => n !== i); change({ ...review, reviewed_intervals: remaining, review_complete: remaining.length > 0 }); }}>Remove interval {i + 1}</button></p>)}</fieldset>
      <Button disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save review"}</Button>
      {review.revision>0&&<a className="ml-3 text-sm text-accent underline" href={`${BASE}${jobId}/review/download`} download="review.json">Download saved labels</a>}
      {saved && <p role="status" className="text-sm text-accent">Review saved. Original analysis artifacts are unchanged.</p>}
    </>}
  </section>;
}
