import { useQueryClient } from "@tanstack/react-query";
import { Maximize, Pause, Play, Repeat, Repeat1, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { MomentItem } from "../../api/types";
import { type Buffers, clipWindow } from "../../lib/events";
import { useClipBuffers } from "../../lib/useClipBuffers";
import { formatClock, formatDate } from "../../lib/format";
import { SPEEDS } from "../VideoPlayer";

export function windowFor(m: MomentItem, buffers: Buffers) {
  return clipWindow({ id: m.event_id, ...m }, buffers, m.match_duration_s ?? Number.MAX_SAFE_INTEGER);
}

interface Props {
  queue: MomentItem[];
  index: number;
  onIndex: (i: number) => void;
  /** bumps every time the owner asks to (re)start playback */
  playToken: number;
}

/** Plays a queue of moments from different matches back to back (brief section 10). */
export function QueuePlayer({ queue, index, onIndex, playToken }: Props) {
  const qc = useQueryClient();
  const video = useRef<HTMLVideoElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [t, setT] = useState(0);
  const buffers = useClipBuffers();
  const m = queue[index];
  const win = m ? windowFor(m, buffers) : null;

  // Load the current moment: switch source if needed, seek to the window start, play if asked.
  useEffect(() => {
    const el = video.current;
    if (!el || !m?.stream_url || !win) return;
    const start = () => {
      el.currentTime = win.start;
      el.playbackRate = speed;
      if (playToken > 0) void el.play();
    };
    if (el.getAttribute("src") !== m.stream_url) {
      el.setAttribute("src", m.stream_url);
      el.load();
      el.addEventListener("loadedmetadata", start, { once: true });
    } else {
      start();
    }
  }, [m?.event_id, playToken]);

  if (!m) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-line bg-ink-950 text-sm text-fg-muted">
        Choose moments and press Play
      </div>
    );
  }

  const go = (d: number) => {
    const n = index + d;
    if (n >= 0 && n < queue.length) onIndex(n);
  };

  return (
    <div className="space-y-3">
      <div ref={shell} className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <video
          ref={video}
          playsInline
          preload="metadata"
          poster={m.thumbnail_url ?? undefined}
          onClick={() => (video.current?.paused ? void video.current.play() : video.current?.pause())}
          onPlay={() => {
            setPlaying(true);
            if (!m.viewed) api.markViewed(m.event_id).then(() => qc.invalidateQueries({ queryKey: ["moments"] }), () => undefined);
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setT(el.currentTime);
            if (!win || el.currentTime < win.end) return;
            if (loop) el.currentTime = win.start;
            else if (autoNext && index < queue.length - 1) onIndex(index + 1);
            else el.pause();
          }}
          className="aspect-video w-full bg-black"
        />
        <div className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs">
          {index + 1} / {queue.length}
        </div>
      </div>

      {/* Clip bar (reference 2): window start / moment / window end */}
      <div className="panel grid grid-cols-[auto_1fr_auto] items-center gap-3 !rounded-2xl px-4 py-3">
        <span className="font-mono text-xs text-fg-muted">{win && formatClock(win.start)}</span>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">
            {m.category}
            {m.players.length > 0 && <span className="font-normal text-fg-muted"> · {m.players.join(", ")}</span>}
          </p>
          <p className="truncate text-[11px] text-fg-subtle">
            {m.team_name} vs {m.opponent} · {formatDate(m.match_date)}{m.note ? ` · ${m.note}` : ""}
          </p>
          {win && (
            <div className="mx-auto mt-2 h-1 max-w-md overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-pin" style={{ width: `${Math.min(100, Math.max(0, ((t - win.start) / (win.end - win.start)) * 100))}%` }} />
            </div>
          )}
        </div>
        <span className="font-mono text-xs text-fg-muted">{win && formatClock(win.end)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button type="button" aria-label="Previous moment" onClick={() => go(-1)} disabled={index === 0} className="grid size-10 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30">
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => (video.current?.paused ? void video.current.play() : video.current?.pause())}
          className="grid size-12 place-items-center rounded-full bg-gradient-to-r from-[#2563eb] to-accent-strong text-white shadow-[0_8px_24px_-8px_rgb(37_99_235/0.9)]"
        >
          {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
        <button type="button" aria-label="Next moment" onClick={() => go(1)} disabled={index >= queue.length - 1} className="grid size-10 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30">
          <SkipForward size={18} />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-pressed={autoNext} onClick={() => setAutoNext((x) => !x)} title="Autoplay the next moment"
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs ${autoNext ? "bg-accent/15 text-accent" : "text-fg-muted hover:bg-white/5"}`}>
            <Repeat size={14} aria-hidden /> Autoplay next
          </button>
          <button type="button" aria-pressed={loop} onClick={() => setLoop((x) => !x)} title="Loop this moment"
            className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs ${loop ? "bg-accent/15 text-accent" : "text-fg-muted hover:bg-white/5"}`}>
            <Repeat1 size={14} aria-hidden /> Loop
          </button>
          <label className="sr-only" htmlFor="queue-speed">Playback speed</label>
          <select id="queue-speed" value={speed} onChange={(e) => {
            const s = Number(e.target.value);
            setSpeed(s);
            if (video.current) video.current.playbackRate = s;
          }} className="h-9 rounded-lg border border-line bg-ink-900 px-2 text-xs">
            {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
          </select>
          <button type="button" aria-label="Full screen" onClick={() => (document.fullscreenElement ? void document.exitFullscreen() : void shell.current?.requestFullscreen?.())}
            className="grid size-9 place-items-center rounded-lg text-fg-muted hover:bg-white/5">
            <Maximize size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
