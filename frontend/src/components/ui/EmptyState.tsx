import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="rounded-2xl border border-line bg-ink-800 p-4 text-accent">
        <Icon size={28} aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="max-w-md text-sm text-fg-muted">{children}</div>
    </div>
  );
}
