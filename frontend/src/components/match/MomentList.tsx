import { Heart } from "lucide-react";
import type { MatchEvent } from "../../api/types";
import { formatClock } from "../../lib/format";

export function MomentList({ events, activeEventId, onSelect, onFavourite }: {
  events: MatchEvent[];
  activeEventId: number | null;
  onSelect: (e: MatchEvent) => void;
  onFavourite?: (e: MatchEvent, favourite: boolean) => void;
}) {
  if (events.length === 0) return <p className="p-4 text-sm text-fg-muted">No moments match these filters.</p>;
  return (
    <ul aria-label="Tagged moments" className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      {events.map((e) => (
        <li
          key={e.id}
          className={`flex items-start rounded-xl border transition ${
            activeEventId === e.id ? "border-accent/50 bg-accent/10" : "border-white/5 bg-ink-900/60 hover:border-white/15"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(e)}
            aria-current={activeEventId === e.id}
            className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-left"
          >
            <span className="mt-0.5 rounded bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-pin">{formatClock(e.time_s)}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {e.category}
                {e.viewed === false && <span className="size-1.5 rounded-full bg-accent" aria-label="not watched yet" />}
              </span>
              {e.players.length > 0 && <span className="block truncate text-xs text-fg-muted">{e.players.join(", ")}</span>}
              {e.note && <span className="block truncate text-xs text-fg-subtle italic">{e.note}</span>}
            </span>
          </button>
          {onFavourite && (
            <button
              type="button"
              aria-label={e.favourite ? `Remove ${e.category} at ${formatClock(e.time_s)} from favourites` : `Add ${e.category} at ${formatClock(e.time_s)} to favourites`}
              aria-pressed={Boolean(e.favourite)}
              onClick={() => onFavourite(e, !e.favourite)}
              className="p-3 text-fg-subtle hover:text-danger"
            >
              <Heart size={16} className={e.favourite ? "fill-danger text-danger" : ""} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
