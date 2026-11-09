import type { LucideIcon } from "lucide-react";

export function StatTile({ label, icon: Icon, value, unit, hint }: {
  label: string; icon: LucideIcon; value: string; unit?: string; hint?: string;
}) {
  return (
    <div className="tile flex min-h-[132px] flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-fg-muted">{label}</span>
        <Icon size={17} className="text-fg-subtle" aria-hidden />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight">
          {value}
          {unit && <span className="ml-1.5 text-sm font-normal text-fg-muted">{unit}</span>}
        </p>
        {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
      </div>
    </div>
  );
}
