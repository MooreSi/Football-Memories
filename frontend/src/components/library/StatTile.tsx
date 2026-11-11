import type { LucideIcon } from "lucide-react";

/** Whole numbers get UK thousand separators; anything else (hours, "-") is shown as written. */
function display(value: string): string {
  return /^\d+$/.test(value) ? Number(value).toLocaleString("en-GB") : value;
}

/** Owner request 2026-11-11: every tile uses the same number size, with the unit on its
 *  own line, so large counts such as 29,687 stay inside the box. The number scales with
 *  the tile's own width (container units), and the grid keeps tiles equal, so the
 *  size stays the same across a row. */
export function StatTile({ label, icon: Icon, value, unit, hint }: {
  label: string; icon: LucideIcon; value: string; unit?: string; hint?: string;
}) {
  return (
    <div role="group" aria-label={label} className="@container tile flex min-h-[132px] min-w-0 flex-col justify-between overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-sm text-fg-muted">{label}</span>
        <Icon size={17} className="shrink-0 text-fg-subtle @max-[7.5rem]:hidden" aria-hidden />
      </div>
      <div className="min-w-0">
        <p data-stat-value className="whitespace-nowrap text-[min(26px,17cqi)] leading-tight font-semibold tracking-tight tabular-nums">{display(value)}</p>
        {unit && <p className="truncate text-sm text-fg-muted">{unit}</p>}
        {hint && <p className="mt-0.5 truncate text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}
