import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-700/80 text-fg-muted border-line",
  accent: "bg-accent/10 text-accent border-accent/30",
  ok: "bg-ok/10 text-ok border-ok/30",
  warn: "bg-warn/10 text-warn border-warn/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  violet: "bg-violet/15 text-[#b4a3ff] border-violet/30",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
