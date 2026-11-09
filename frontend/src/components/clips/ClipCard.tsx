import { Heart, ListPlus, Play } from "lucide-react";
import type { MomentItem } from "../../api/types";
import { formatClock, formatDate } from "../../lib/format";
import { useClipBuffers } from "../../lib/useClipBuffers";
import { windowFor } from "./QueuePlayer";

export function ClipCard({ m, onPlay, onQueue, onFavourite, queued }: {
  m: MomentItem;
  onPlay: () => void;
  onQueue: () => void;
  onFavourite: (fav: boolean) => void;
  queued: boolean;
}) {
  const w = windowFor(m, useClipBuffers());
  return (
    <article aria-label={`${m.category} vs ${m.opponent} at ${formatClock(m.time_s)}`} className="tile group overflow-hidden">
      <button type="button" onClick={onPlay} className="relative block aspect-video w-full overflow-hidden bg-ink-800" aria-label={`Play ${m.category} at ${formatClock(m.time_s)}`}>
        {m.thumbnail_url && m.offline ? (
          <img src={m.thumbnail_url} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        ) : (
          <span className="grid size-full place-items-center text-xs text-fg-subtle">{m.offline ? "No preview" : "Video file missing"}</span>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" />
        <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/20 opacity-0 backdrop-blur transition group-hover:opacity-100">
          <Play size={18} className="ml-0.5" />
        </span>
        <span className="absolute top-2 left-2 -skew-x-6 bg-pin px-1.5 py-0.5 text-[11px] font-extrabold text-ink-950 uppercase italic">{m.category}</span>
        <span className="absolute right-2 bottom-2 rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[11px]">{formatClock(w.end - w.start)}</span>
        {!m.viewed && <span className="absolute top-2 right-2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-ink-950">NEW</span>}
      </button>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium">{m.players.length ? m.players.join(", ") : "No player tagged"}</p>
        <p className="truncate text-xs text-fg-muted">{m.team_name} vs {m.opponent}</p>
        <p className="text-[11px] text-fg-subtle">
          {formatDate(m.match_date)} · <span className="font-mono">{formatClock(w.start)}-{formatClock(w.end)}</span>
          {!m.offline && <span className="text-danger"> · offline copy missing</span>}
        </p>
        <div className="flex items-center gap-1 pt-1">
          <button type="button" onClick={onQueue} disabled={queued} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-fg-muted hover:bg-white/5 hover:text-fg disabled:opacity-40">
            <ListPlus size={14} aria-hidden /> {queued ? "In queue" : "Add to queue"}
          </button>
          <button type="button" aria-pressed={m.favourite} aria-label={m.favourite ? "Remove from favourites" : "Add to favourites"}
            onClick={() => onFavourite(!m.favourite)} className="ml-auto grid size-8 place-items-center rounded-lg hover:bg-white/5">
            <Heart size={15} className={m.favourite ? "fill-danger text-danger" : "text-fg-subtle"} />
          </button>
        </div>
      </div>
    </article>
  );
}
