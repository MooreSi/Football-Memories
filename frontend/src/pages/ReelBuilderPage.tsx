import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clapperboard, Download, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { MomentItem, ReelDetail } from "../api/types";
import { QueuePlayer } from "../components/clips/QueuePlayer";
import { CardEditor } from "../components/reels/CardEditor";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { formatBytes, formatClock, formatDate } from "../lib/format";
import { moveItem } from "../lib/queue";
import { canvasToPng, drawTitleCard } from "../lib/titleCard";
import { useClipBuffers } from "../lib/useClipBuffers";
import { STATUS } from "./ReelsPage";

interface DraftItem {
  event_id: number;
  pre_s: number | null;
  post_s: number | null;
  moment: MomentItem;
}

function windowOf(d: DraftItem, defPre: number, defPost: number) {
  const m = d.moment;
  const start = Math.max(0, m.time_s - (d.pre_s ?? defPre));
  const end = Math.min(m.match_duration_s ?? Number.MAX_SAFE_INTEGER, m.time_s + m.duration_s + (d.post_s ?? defPost));
  return { start, end };
}

export function ReelBuilderPage() {
  const id = Number(useParams().id);
  const q = useQuery({
    queryKey: ["reel", id],
    queryFn: () => api.reel(id),
    refetchInterval: (query) => (["queued", "rendering"].includes(query.state.data?.status ?? "") ? 1000 : false),
  });
  if (q.isPending) return <Spinner label="Loading reel" />;
  if (q.isError) return <EmptyState icon={Clapperboard} title="Reel not found"><Link to="/clips/reels" className="text-accent">All reels</Link></EmptyState>;
  return <Builder key={q.data.id} reel={q.data} />;
}

/** Brief sections 17 and 18: choose, trim, order, title and render a highlight reel. */
function Builder({ reel }: { reel: ReelDetail }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const buffers = useClipBuffers();
  const [name, setName] = useState(reel.name);
  const [opening, setOpening] = useState(reel.has_opening_card || Boolean(reel.opening_title));
  const [closing, setClosing] = useState(reel.has_closing_card || Boolean(reel.closing_text));
  const [title, setTitle] = useState(reel.opening_title ?? reel.name);
  const [subtitle, setSubtitle] = useState(reel.opening_subtitle ?? "");
  const [closingText, setClosingText] = useState(reel.closing_text ?? "");
  const [items, setItems] = useState<DraftItem[]>(reel.items.map((i) => ({ event_id: i.moment.event_id, pre_s: i.pre_s, post_s: i.post_s, moment: i.moment })));
  const [preview, setPreview] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const openingCanvas = useRef<HTMLCanvasElement>(null);
  const closingCanvas = useRef<HTMLCanvasElement>(null);
  const busy = reel.status === "queued" || reel.status === "rendering";

  useEffect(() => {
    if (reel.status === "done" || reel.status === "failed") void qc.invalidateQueries({ queryKey: ["reels"] });
  }, [reel.status, qc]);

  const totalSeconds = useMemo(
    () => items.reduce((s, d) => { const w = windowOf(d, buffers.pre, buffers.post); return s + (w.end - w.start); }, 0)
      + (opening ? 3 : 0) + (closing ? 3 : 0),
    [items, buffers, opening, closing],
  );

  const save = async () => {
    await api.updateReel(reel.id, {
      name, items: items.map(({ event_id, pre_s, post_s }) => ({ event_id, pre_s, post_s })),
      opening_title: opening ? title : null, opening_subtitle: opening ? subtitle : null, closing_text: closing ? closingText : null,
    });
    for (const [kind, on, canvas, text, sub] of [
      ["opening", opening, openingCanvas.current, title, subtitle],
      ["closing", closing, closingCanvas.current, closingText, undefined],
    ] as const) {
      if (on && canvas && drawTitleCard(canvas, { kind, title: text || " ", subtitle: sub || undefined })) {
        const png = await canvasToPng(canvas);
        if (png) await api.uploadCard(reel.id, kind, png);
      } else if (!on) {
        await api.deleteCard(reel.id, kind);
      }
    }
  };

  const render = useMutation({
    mutationFn: async () => {
      setError(null);
      await save();
      return api.renderReel(reel.id);
    },
    onSuccess: (r) => qc.setQueryData(["reel", reel.id], r),
    onError: (e) => setError((e as Error).message),
  });
  const saveOnly = useMutation({
    mutationFn: save,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["reel", reel.id] }),
    onError: (e) => setError((e as Error).message),
  });
  const remove = useMutation({
    mutationFn: () => api.deleteReel(reel.id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["reels"] }); navigate("/clips/reels"); },
  });

  const setTrim = (i: number, key: "pre_s" | "post_s", v: string) =>
    setItems((list) => list.map((d, n) => (n === i ? { ...d, [key]: v === "" ? null : Math.max(0, Math.min(120, Number(v))) } : d)));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link to="/clips/reels" className="text-sm text-fg-muted hover:text-fg">Highlight reels</Link>
          <input className="mt-1 block w-full max-w-xl bg-transparent text-3xl font-semibold tracking-tight outline-none focus:ring-1 focus:ring-accent/50"
            value={name} onChange={(e) => setName(e.target.value)} aria-label="Reel name" disabled={busy} maxLength={200} />
          <p className="mt-1 flex items-center gap-2 text-sm text-fg-muted">
            <Badge tone={STATUS[reel.status].tone}>{STATUS[reel.status].label}</Badge>
            {items.length} clips · about {formatClock(totalSeconds)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => saveOnly.mutate()} disabled={busy || saveOnly.isPending}>Save</Button>
          <Button variant="primary" onClick={() => render.mutate()} disabled={busy || items.length === 0 || render.isPending}>
            <Clapperboard size={15} aria-hidden /> {busy ? "Rendering" : reel.status === "done" ? "Render again" : "Render video"}
          </Button>
          <Button variant="ghost" aria-label="Delete reel" disabled={busy}
            onClick={() => { if (window.confirm(`Delete "${reel.name}" and its rendered video? Your match footage is not affected.`)) remove.mutate(); }}>
            <Trash2 size={15} aria-hidden />
          </Button>
        </div>
      </header>

      {(error || reel.status === "failed") && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error ?? reel.error}</p>
      )}

      {busy && (
        <section aria-label="Render progress" className="panel space-y-2 p-5">
          <p className="text-sm">{reel.status === "queued" ? "Waiting to start" : "Rendering your reel"} · {Math.round(reel.progress * 100)}%</p>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-accent to-violet transition-all" style={{ width: `${Math.round(reel.progress * 100)}%` }} /></div>
          <p className="text-xs text-fg-subtle">You can leave this page; rendering continues in the background.</p>
        </section>
      )}

      {reel.video_url && !busy && (
        <section aria-label="Finished reel" className="panel grid gap-5 p-5 lg:grid-cols-[minmax(0,2fr)_1fr]">
          <video src={reel.video_url} controls playsInline className="w-full rounded-xl bg-black" />
          <div className="space-y-3 text-sm">
            <h2 className="text-lg font-semibold">Your reel is ready</h2>
            <dl className="grid grid-cols-2 gap-2 text-fg-muted">
              <dt>Length</dt><dd className="text-fg">{formatClock(reel.output_duration_s ?? 0)}</dd>
              <dt>Quality</dt><dd className="text-fg">{reel.output_width} x {reel.output_height}</dd>
              <dt>Size</dt><dd className="text-fg">{formatBytes(reel.output_bytes ?? 0)}</dd>
              <dt>Made</dt><dd className="text-fg">{reel.rendered_at ? new Date(reel.rendered_at).toLocaleString() : ""}</dd>
            </dl>
            <a href={`${reel.video_url}?download=1`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-[#2563eb] to-accent-strong px-4 font-semibold text-white">
              <Download size={15} aria-hidden /> Download MP4
            </a>
            <p className="text-xs text-fg-subtle">
              Saved in your archive under <code>{reel.output_relpath}</code>. Clips are re-encoded at the quality of the best source (H.264,
              high quality) so footage from different matches joins smoothly; your original videos are never changed.
            </p>
            {reel.status === "draft" && <p className="text-xs text-warn">You have changed the reel since this video was made. Render again to update it.</p>}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-label="Clips in this reel" className="space-y-4">
          {items.length > 0 && (
            <QueuePlayer
              queue={items.map((d) => d.moment)}
              index={Math.min(preview, items.length - 1)}
              onIndex={setPreview}
              playToken={playToken}
              windowOf={(m) => { const d = items.find((x) => x.event_id === m.event_id)!; return windowOf(d, buffers.pre, buffers.post); }}
            />
          )}
          <ol aria-label="Reel clips" className="space-y-2">
            {items.map((d, i) => {
              const w = windowOf(d, buffers.pre, buffers.post);
              return (
                <li key={d.event_id} className={`tile flex flex-wrap items-center gap-3 p-3 ${i === preview ? "ring-1 ring-accent/50" : ""}`}>
                  <button type="button" onClick={() => { setPreview(i); setPlayToken((n) => n + 1); }} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Preview ${d.moment.category} vs ${d.moment.opponent}`}>
                    <span className="w-5 text-right text-xs text-fg-subtle tabular-nums">{i + 1}</span>
                    {d.moment.thumbnail_url && <img src={d.moment.thumbnail_url} alt="" className="aspect-video w-24 rounded-md object-cover" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.moment.category}{d.moment.players.length ? ` · ${d.moment.players.join(", ")}` : ""}</span>
                      <span className="block truncate text-xs text-fg-subtle">vs {d.moment.opponent} · {formatDate(d.moment.match_date)} · <span className="font-mono">{formatClock(w.start)}-{formatClock(w.end)}</span></span>
                    </span>
                  </button>
                  <label className="text-xs text-fg-muted">Before
                    <input type="number" min={0} max={120} step={1} className="field ml-1 w-16 px-2 py-1" placeholder={String(buffers.pre)} value={d.pre_s ?? ""} disabled={busy}
                      onChange={(e) => setTrim(i, "pre_s", e.target.value)} aria-label={`Seconds before ${d.moment.category} ${i + 1}`} />
                  </label>
                  <label className="text-xs text-fg-muted">After
                    <input type="number" min={0} max={120} step={1} className="field ml-1 w-16 px-2 py-1" placeholder={String(buffers.post)} value={d.post_s ?? ""} disabled={busy}
                      onChange={(e) => setTrim(i, "post_s", e.target.value)} aria-label={`Seconds after ${d.moment.category} ${i + 1}`} />
                  </label>
                  <div className="flex">
                    <button type="button" aria-label={`Move clip ${i + 1} up`} disabled={busy || i === 0} onClick={() => setItems((l) => moveItem(l, i, i - 1))} className="rounded p-1.5 text-fg-subtle hover:text-fg disabled:opacity-20"><ChevronUp size={15} /></button>
                    <button type="button" aria-label={`Move clip ${i + 1} down`} disabled={busy || i === items.length - 1} onClick={() => setItems((l) => moveItem(l, i, i + 1))} className="rounded p-1.5 text-fg-subtle hover:text-fg disabled:opacity-20"><ChevronDown size={15} /></button>
                    <button type="button" aria-label={`Remove clip ${i + 1}`} disabled={busy} onClick={() => setItems((l) => l.filter((_, n) => n !== i))} className="rounded p-1.5 text-fg-subtle hover:text-danger disabled:opacity-20"><X size={15} /></button>
                  </div>
                </li>
              );
            })}
          </ol>
          {items.length === 0 && <p className="panel p-6 text-sm text-fg-muted">No clips. Add moments from the <Link to="/clips" className="text-accent">Clip Explorer</Link>.</p>}
          <p className="text-xs text-fg-subtle">Leave Before/After empty to use your Settings ({buffers.pre}s / {buffers.post}s).</p>
        </section>

        <aside className="space-y-4">
          <CardEditor kind="opening" enabled={opening} onEnabled={setOpening} title={title} onTitle={setTitle} subtitle={subtitle} onSubtitle={setSubtitle} canvasRef={openingCanvas} />
          <CardEditor kind="closing" enabled={closing} onEnabled={setClosing} title={closingText} onTitle={setClosingText} canvasRef={closingCanvas} />
        </aside>
      </div>
    </div>
  );
}
