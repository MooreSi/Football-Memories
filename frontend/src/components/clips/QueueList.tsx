import { ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import { useState } from "react";
import type { MomentItem } from "../../api/types";
import { formatClock } from "../../lib/format";

/** The play queue. Drag to reorder, or use the arrow buttons (keyboard friendly). */
export function QueueList({ queue, index, onPick, onMove, onRemove }: {
  queue: MomentItem[];
  index: number;
  onPick: (i: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (i: number) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  if (queue.length === 0) return <p className="p-4 text-sm text-fg-muted">The queue is empty. Use Play all or Add to queue.</p>;
  return (
    <ol aria-label="Play queue" className="space-y-1">
      {queue.map((m, i) => (
        <li
          key={m.event_id}
          draggable
          onDragStart={() => setDrag(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (drag !== null) onMove(drag, i);
            setDrag(null);
          }}
          className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-sm ${
            i === index ? "border-accent/50 bg-accent/10" : "border-white/5 bg-ink-900/60"
          } ${drag === i ? "opacity-50" : ""}`}
        >
          <GripVertical size={14} className="shrink-0 cursor-grab text-fg-subtle" aria-hidden />
          <button type="button" onClick={() => onPick(i)} aria-current={i === index} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="w-5 text-right text-[11px] text-fg-subtle tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{m.category}</span>
              <span className="block truncate text-[11px] text-fg-subtle">vs {m.opponent} · {formatClock(m.time_s)}</span>
            </span>
          </button>
          <button type="button" aria-label={`Move ${m.category} up`} disabled={i === 0} onClick={() => onMove(i, i - 1)} className="rounded p-1 text-fg-subtle hover:text-fg disabled:opacity-20"><ChevronUp size={14} /></button>
          <button type="button" aria-label={`Move ${m.category} down`} disabled={i === queue.length - 1} onClick={() => onMove(i, i + 1)} className="rounded p-1 text-fg-subtle hover:text-fg disabled:opacity-20"><ChevronDown size={14} /></button>
          <button type="button" aria-label={`Remove ${m.category} from the queue`} onClick={() => onRemove(i)} className="rounded p-1 text-fg-subtle hover:text-danger"><X size={14} /></button>
        </li>
      ))}
    </ol>
  );
}
