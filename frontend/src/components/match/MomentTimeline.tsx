import type { MatchEvent } from "../../api/types";
import { formatClock } from "../../lib/format";

interface Props {
  events: MatchEvent[];
  duration: number;
  time: number;
  activeEventId: number | null;
  onPin: (e: MatchEvent) => void;
  onSeek: (t: number) => void;
}

/** Reference 2's bottom strip: the whole match with a pin per moment and the playhead. */
export function MomentTimeline({ events, duration, time, activeEventId, onPin, onSeek }: Props) {
  const pct = (t: number) => `${duration > 0 ? Math.min(100, (t / duration) * 100) : 0}%`;
  return (
    <div className="flex items-center gap-3 px-1">
      <span className="font-mono text-[11px] text-fg-muted">0:00</span>
      <div
        className="relative h-12 flex-1 cursor-pointer"
        onClick={(e) => {
          if (duration <= 0) return;
          const r = e.currentTarget.getBoundingClientRect();
          onSeek(((e.clientX - r.left) / r.width) * duration);
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/15" />
        <div className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-white/60" style={{ width: pct(time) }} />
        {events.map((e) => {
          const active = e.id === activeEventId;
          return (
            <button
              key={e.id}
              type="button"
              aria-label={`${e.category} at ${formatClock(e.time_s)}`}
              aria-current={active}
              title={`${e.category} ${formatClock(e.time_s)}${e.players.length ? ` - ${e.players.join(", ")}` : ""}`}
              onClick={(ev) => {
                ev.stopPropagation();
                onPin(e);
              }}
              data-left={pct(e.time_s)}
              className="group absolute top-0 flex h-1/2 -translate-x-1/2 flex-col items-center"
              style={{ left: pct(e.time_s) }}
            >
              <span className={`size-3 rounded-full ring-2 ring-ink-950 transition group-hover:scale-125 ${active ? "bg-white" : "bg-pin"}`} />
              <span className={`w-px flex-1 ${active ? "bg-white" : "bg-pin/70"}`} />
            </button>
          );
        })}
        <div className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: pct(time) }} />
      </div>
      <span className="font-mono text-[11px] text-fg-muted">{formatClock(duration)}</span>
    </div>
  );
}
