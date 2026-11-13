import { useEffect, useState } from "react";
import { clubKey, resolveClub } from "../lib/clubs";
/** Actual cached club crests, with initials when an identity cannot be resolved. */
export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const letters = words.filter((w) => !/^U\d+$/i.test(w)).slice(0, 2).map((w) => w[0]);
  return (letters.join("") || name.slice(0, 2)).toUpperCase();
}

// Owner report 2026-11-13: Wikipedia sometimes asks the app to slow down (about 20s),
// so a crest that failed is asked for again twice before the initials stay.
const RETRY_MS = [30_000, 90_000];

const SIZES = { sm: "size-9 text-xs", md: "size-14 text-base", lg: "size-20 text-xl" } as const;

function TeamIdentity({ name, size = "md", tone = "home" }: { name: string; size?: keyof typeof SIZES; tone?: "home" | "away" }) {
  // "Home" and "Opposition" stand in for an unknown side: there is no crest to ask for.
  const placeholder = /^(?:home|away|opposition)$/i.test(name.trim());
  const [failed, setFailed] = useState(placeholder);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!failed || placeholder || attempt >= RETRY_MS.length) return;
    const timer = setTimeout(() => { setAttempt((n) => n + 1); setFailed(false); }, RETRY_MS[attempt]);
    return () => clearTimeout(timer);
  }, [failed, placeholder, attempt]);
  // A nickname or short form asks for the full club; otherwise the name goes as written.
  const resolved = resolveClub(name);
  const query = clubKey(resolved) === clubKey(name) ? name : resolved;
  const src = `/api/team-logo?name=${encodeURIComponent(query)}${attempt ? `&try=${attempt}` : ""}`;
  // Owner request 2026-11-11: every real crest sits on the same plain disc with the
  // same inset, so tall, wide and round crests all fit inside the circle alike.
  // Only the initials fallback is coloured by home/away.
  const fallback =
    tone === "home"
      ? "bg-gradient-to-br from-accent/90 to-[#3b82f6] text-ink-950"
      : "bg-gradient-to-br from-[#e8eef8] to-[#93a1bd] text-ink-950";
  return (
    <span
      aria-hidden
      data-crest
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold shadow-[0_8px_24px_-8px_rgb(0_0_0/0.8)] ring-2 ring-white/15 ${failed ? fallback : "bg-[radial-gradient(circle_at_35%_30%,#ffffff,#e6e9f0)]"} ${SIZES[size]}`}
    >
      {!failed ? <img src={src} alt=""
        onError={() => setFailed(true)} className="absolute inset-[16%] size-[68%] object-contain" /> : initials(name)}
    </span>
  );
}

export function TeamBadge(props: { name: string; size?: keyof typeof SIZES; tone?: "home" | "away" }) {
  return <TeamIdentity key={props.name} {...props} />;
}
