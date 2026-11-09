import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "subtle" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-accent-strong to-[#3b82f6] text-ink-950 font-semibold hover:brightness-110 shadow-[0_6px_24px_-8px_rgb(34_211_238/0.6)]",
  subtle: "bg-ink-700/70 text-fg hover:bg-ink-700 border border-line",
  ghost: "text-fg-muted hover:text-fg hover:bg-ink-700/60",
};

export function Button({
  variant = "subtle",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}
