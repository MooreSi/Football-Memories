import { type ReactNode, useId } from "react";
import { Zap } from "lucide-react";
import { OURS, THEIRS } from "../../lib/teamColours";

/** The Match stats look (owner request 2026-11-26, references docs/design/reference/04-07),
 *  shared since 2026-11-27 by Player stats, Goals & Keepers and Player Lab. */
export const OURS_FILL = "linear-gradient(90deg, #0e7490, #22d3ee 70%, #a5f3fc)";
export const THEIRS_FILL = "linear-gradient(90deg, #fdba74, #fb923c 30%, #c2410c)";
export const OURS_COLUMN = "linear-gradient(180deg, #a5f3fc, #22d3ee 35%, #0e7490)";

export function StatsHeader({ icon, title, sub, children }: { icon: ReactNode; title: string; sub: string; children?: ReactNode }) {
  return <header className="flex flex-wrap items-end gap-3">
    <div className="mr-auto"><h2 className="flex items-center gap-2 text-xl font-semibold">{icon} {title}</h2>
      <p className="mt-1 text-[11px] tracking-[0.18em] text-fg-subtle uppercase">{sub}</p></div>
    {children}
  </header>;
}

export function Card({ title, sub, children, className = "" }: { title: string; sub: string; children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-[1.25rem] border border-line bg-gradient-to-b from-ink-800/80 to-ink-900/60 p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] ${className}`}>
    <h3 className="text-base font-semibold">{title}</h3>
    <p className="mt-0.5 mb-5 text-[11px] tracking-[0.18em] text-fg-subtle uppercase">{sub}</p>
    {children}
  </div>;
}

/** A big-number tile with a soft glow, as the Match stats headlines. */
export function Figure({ name, value, unit = "", note, glow = OURS }: { name: string; value: ReactNode; unit?: string; note?: ReactNode; glow?: string }) {
  return <figure aria-label={`${name} headline`} className="relative min-w-0 overflow-hidden rounded-[1.25rem] border border-line bg-ink-850 p-4 sm:p-5">
    <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-25 blur-2xl" style={{ background: glow }} />
    <p className="relative text-sm font-medium text-fg-muted">{name}</p>
    <p className="relative mt-3 truncate text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{value}{unit && <span className="text-lg font-semibold text-fg-muted">{unit}</span>}</p>
    {note && <div className="relative mt-4 truncate text-xs text-fg-subtle">{note}</div>}
  </figure>;
}

export function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

export function Ring({ label, value, colour, note, size = "h-40 w-40" }: { label: string; value: number | null; colour: "ours" | "theirs"; note: string; size?: string }) {
  const id = useSvgId("ring");
  const r = 52, c = 2 * Math.PI * r;
  const shown = value ?? 0;
  const [from, to] = colour === "ours" ? ["#67e8f9", "#0891b2"] : ["#fdba74", "#ea580c"];
  return <figure className="flex flex-col items-center gap-3">
    <figcaption className="text-center text-sm font-semibold">{label}</figcaption>
    <div role="img" aria-label={value === null ? `${label} not available` : `${label} ${value}%`} className={`relative ${size}`}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient></defs>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="12" />
        {shown > 0 && <circle cx="64" cy="64" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(shown / 100) * c} ${c}`} style={{ filter: `drop-shadow(0 0 6px ${colour === "ours" ? OURS : THEIRS}55)` }} />}
      </svg>
      <span aria-hidden className="absolute inset-0 grid place-items-center">
        <span className="tabular-nums"><span className="text-4xl font-bold">{value ?? "–"}</span>{value !== null && <span className="text-lg font-semibold text-fg-muted">%</span>}</span>
      </span>
    </div>
    <p className="text-center text-xs text-fg-subtle">{note}</p>
  </figure>;
}

/** One gradient bar against a shared scale. */
export function GradientBar({ value, max, fill = OURS_FILL, glow = false }: { value: number; max: number; fill?: string; glow?: boolean }) {
  return <div aria-hidden className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
    <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, value / Math.max(1, max))) * 100}%`, background: fill, boxShadow: glow ? `0 0 12px ${OURS}66` : undefined }} />
  </div>;
}

export function Standouts({ notes, footnote }: { notes: { lead: string; parts: string[] }[]; footnote: string }) {
  return <div className="relative overflow-hidden rounded-[1.25rem] border border-violet/40 bg-gradient-to-br from-violet/[0.12] via-ink-900/60 to-ink-900/60 p-5 shadow-[0_0_40px_-12px_rgb(124_92_255/0.45)]">
    <h3 className="flex items-center gap-2 font-semibold"><Zap size={16} className="text-violet" aria-hidden /> What stood out?</h3>
    <ul aria-label="What stood out" className="mt-4 list-disc space-y-2.5 pl-5 text-sm leading-relaxed marker:text-violet">
      {notes.map(n => <li key={n.lead}><span className="font-semibold">{n.lead}: </span>
        {n.parts.map((p, i) => (i % 2 === 1
          ? <span key={i} className="rounded-md bg-violet/25 px-1.5 py-0.5 font-medium text-[#d9d0ff]">{p}</span>
          : <span key={i} className="text-fg-muted">{p}</span>))}
      </li>)}
    </ul>
    <p className="mt-4 text-[11px] text-fg-subtle">{footnote}</p>
  </div>;
}
