/** Initials in a gradient disc. No club crests or flags: we never invent identity art. */
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const letters = words.filter((w) => !/^U\d+$/i.test(w)).slice(0, 2).map((w) => w[0]);
  return (letters.join("") || name.slice(0, 2)).toUpperCase();
}

const SIZES = { sm: "size-9 text-xs", md: "size-14 text-base", lg: "size-20 text-xl" } as const;

export function TeamBadge({ name, size = "md", tone = "home" }: { name: string; size?: keyof typeof SIZES; tone?: "home" | "away" }) {
  const bg =
    tone === "home"
      ? "from-accent/90 to-[#3b82f6] text-ink-950"
      : "from-[#e8eef8] to-[#93a1bd] text-ink-950";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold shadow-[0_8px_24px_-8px_rgb(0_0_0/0.8)] ring-2 ring-white/10 ${bg} ${SIZES[size]}`}
    >
      {initials(name)}
    </span>
  );
}
