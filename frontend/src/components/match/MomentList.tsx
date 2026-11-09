import type { MatchEvent } from "../../api/types";
import { formatClock } from "../../lib/format";

export function MomentList({ events, activeEventId, onSelect }: {
  events: MatchEvent[]; activeEventId: number | null; onSelect: (e: MatchEvent) => void;
}) {
  if (events.length === 0) return <p className="p-4 text-sm text-fg-muted">No moments match these filters.</p>;
  return (
    <ul aria-label="Tagged moments" className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      {events.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            onClick={() => onSelect(e)}
            aria-current={activeEventId === e.id}
            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
              activeEventId === e.id ? "border-accent/50 bg-accent/10" : "border-white/5 bg-ink-900/60 hover:border-white/15"
            }`}
          >
            <span className="mt-0.5 rounded bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-pin">{formatClock(e.time_s)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{e.category}</span>
              {e.players.length > 0 && <span className="block truncate text-xs text-fg-muted">{e.players.join(", ")}</span>}
              {e.note && <span className="block truncate text-xs text-fg-subtle italic">{e.note}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
