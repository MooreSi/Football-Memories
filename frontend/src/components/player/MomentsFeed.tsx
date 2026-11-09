import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ExternalLink, Heart, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { PlayerMoment } from "../../api/types";
import { clipWindow } from "../../lib/events";
import { useClipBuffers } from "../../lib/useClipBuffers";
import { formatClock, formatDate } from "../../lib/format";

/** Reference 03's phone feed: the player's moments, one at a time, played from the local match file. */
export function MomentsFeed({ moments, shirt }: { moments: PlayerMoment[]; shirt: string | null }) {
  const qc = useQueryClient();
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const buffers = useClipBuffers();
  const m = moments[Math.min(i, moments.length - 1)];
  const win = m ? clipWindow({ id: m.event_id, ...m }, buffers, m.match_duration_s ?? Number.MAX_SAFE_INTEGER) : null;

  const favourite = useMutation({
    mutationFn: (fav: boolean) => api.setFavourite(m.event_id, fav),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["player"] }),
  });

  useEffect(() => {
    const el = video.current;
    if (!el || !m?.stream_url || !win) return;
    const start = () => {
      el.currentTime = win.start;
    };
    if (el.readyState >= 1 && el.currentSrc.endsWith(m.stream_url)) start();
    else el.addEventListener("loadedmetadata", start, { once: true });
    if (playing) void el.play();
  }, [m?.event_id]);

  if (!m) {
    return (
      <div className="grid aspect-[9/19] w-full max-w-[300px] place-items-center rounded-[2.5rem] border-[10px] border-ink-700 bg-ink-950 p-6 text-center text-sm text-fg-muted">
        No moments yet
      </div>
    );
  }

  const go = (d: number) => setI((x) => Math.max(0, Math.min(moments.length - 1, x + d)));
  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <section aria-label="Moments feed" className="relative mx-auto aspect-[9/19] w-full max-w-[300px] overflow-hidden rounded-[2.75rem] border-[10px] border-[#1f2937] bg-black shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] ring-1 ring-white/10">
      <div className="absolute top-2 left-1/2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      {m.stream_url ? (
        <video
          ref={video}
          src={m.stream_url}
          poster={m.thumbnail_url ?? undefined}
          playsInline
          preload="metadata"
          onClick={toggle}
          onPlay={() => {
            setPlaying(true);
            if (!m.viewed) api.markViewed(m.event_id).then(() => qc.invalidateQueries({ queryKey: ["player"] }));
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            if (win && e.currentTarget.currentTime >= win.end) {
              if (i < moments.length - 1) go(1);
              else e.currentTarget.pause();
            }
          }}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-fg-muted">Video file missing</div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/85" />

      <span className="absolute top-[22%] left-1/2 z-10 -translate-x-1/2 -skew-x-6 bg-pin px-3 py-1 text-lg font-extrabold tracking-wide whitespace-nowrap text-ink-950 uppercase italic shadow-lg">
        {shirt ? `#${shirt} ` : ""}{m.category}
      </span>

      {!playing && (
        <button type="button" onClick={toggle} aria-label="Play moment" className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30">
          <Play size={28} className="ml-1" />
        </button>
      )}

      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        <button type="button" aria-label={m.favourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={m.favourite}
          onClick={() => favourite.mutate(!m.favourite)} className="flex flex-col items-center gap-1 text-xs">
          <Heart size={26} className={m.favourite ? "fill-danger text-danger" : ""} />
        </button>
        <button type="button" aria-label="Previous moment" onClick={() => go(-1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp size={26} /></button>
        <button type="button" aria-label="Next moment" onClick={() => go(1)} disabled={i >= moments.length - 1} className="disabled:opacity-30"><ChevronDown size={26} /></button>
        <Link to={`/matches/${m.match_id}?moment=${m.event_id}`} aria-label="Open in match"><ExternalLink size={22} /></Link>
        {playing && (
          <button type="button" aria-label="Pause" onClick={toggle}><Pause size={22} /></button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-sm font-semibold">vs {m.opponent}</p>
        <p className="text-xs text-white/75">
          {formatDate(m.match_date)} · {formatClock(m.time_s)}
          {m.note ? ` · ${m.note}` : ""}
        </p>
        <p className="mt-2 text-[11px] text-white/50">
          {i + 1} of {moments.length}
        </p>
      </div>
    </section>
  );
}
