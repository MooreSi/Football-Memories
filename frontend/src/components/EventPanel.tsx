import { useEffect, useMemo, useState } from "react";
import type { MatchEvent } from "../api/types";
import { type FilterMode, filterEvents } from "../lib/events";
import { formatClock } from "../lib/format";

interface Props {
  events: MatchEvent[];
  activeEventId: number | null;
  onSelect: (e: MatchEvent) => void;
  onFilterChange: (filtered: MatchEvent[]) => void;
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-accent/60 bg-accent/15 text-accent"
          : "border-line bg-ink-800 text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

export function EventPanel({ events, activeEventId, onSelect, onFilterChange }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [mode, setMode] = useState<FilterMode>("or");

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [events]);

  const playerCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) for (const p of e.players) m.set(p, (m.get(p) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  const filtered = useMemo(
    () => filterEvents(events, { categories, players, mode }),
    [events, categories, players, mode],
  );

  useEffect(() => onFilterChange(filtered), [filtered, onFilterChange]);

  return (
    <section className="panel flex max-h-[calc(100vh-7rem)] min-h-0 flex-col" aria-label="Moments">
      <div className="space-y-4 border-b border-line p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tagged moments</h2>
          <span className="text-xs text-fg-muted">
            {filtered.length} of {events.length}
          </span>
        </div>

        {categoryCounts.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Event type</p>
            <div className="flex flex-wrap gap-1.5">
              {categoryCounts.map(([c, n]) => (
                <Chip key={c} active={categories.includes(c)} onClick={() => setCategories((l) => toggle(l, c))}>
                  {c} ({n})
                </Chip>
              ))}
            </div>
          </div>
        )}

        {playerCounts.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-fg-subtle uppercase">Players</p>
            <div className="flex flex-wrap gap-1.5">
              {playerCounts.map(([p, n]) => (
                <Chip key={p} active={players.includes(p)} onClick={() => setPlayers((l) => toggle(l, p))}>
                  {p} ({n})
                </Chip>
              ))}
            </div>
          </div>
        )}

        {(categoryCounts.length > 1 || playerCounts.length > 0) && (
          <div role="radiogroup" aria-label="Filter logic" className="inline-flex rounded-lg border border-line bg-ink-900 p-0.5 text-xs">
            {(["or", "and"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 ${mode === m ? "bg-ink-700 text-fg" : "text-fg-muted"}`}
              >
                {m === "or" ? "Match any" : "Match all"}
              </button>
            ))}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <p className="p-4 text-sm text-fg-muted">
          No tagged moments for this match. Add a <code className="text-fg">.tags.csv</code> file next to the video
          when importing to see them here.
        </p>
      ) : (
        <ul aria-label="Tagged moments" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onSelect(e)}
                aria-current={activeEventId === e.id}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ${
                  activeEventId === e.id ? "bg-accent/10 ring-1 ring-accent/40" : "hover:bg-ink-700/60"
                }`}
              >
                <span className="mt-0.5 rounded bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                  {formatClock(e.time_s)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{e.category}</span>
                  {e.players.length > 0 && (
                    <span className="block truncate text-xs text-fg-muted">{e.players.join(", ")}</span>
                  )}
                  {e.note && <span className="block text-xs text-fg-subtle italic">{e.note}</span>}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="p-3 text-sm text-fg-muted">No moments match these filters.</li>}
        </ul>
      )}
    </section>
  );
}
