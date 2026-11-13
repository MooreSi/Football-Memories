import type { HudlMoment } from "../api/hudl";
import { looksLikePlayer } from "./hudlPlayer";

export type Kind = { name: string; count: number };
export type Axis = { name: string; ours: number; theirs: number };

const NOISE = new Set(["BALL OUT OF PLAY", "BALL IN PLAY"]);
const THEIRS = /^(?:OPPOSITION|OPP)\s+(.+)$/i;

/** Situation codes in one match: player-name codes and in/out-of-play markers are left
 *  out, because they say who was involved or nothing at all, not what happened. */
function situations(moments: HudlMoment[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of moments) {
    if (NOISE.has(m.category.toUpperCase()) || looksLikePlayer(m.category)) continue;
    counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
  }
  return counts;
}

const byCount = (a: Kind, b: Kind) => b.count - a.count || a.name.localeCompare(b.name);

/** Every situation code in the match, most frequent first. */
export function matchProfile(moments: HudlMoment[]): Kind[] {
  return [...situations(moments)].map(([name, count]) => ({ name, count })).sort(byCount);
}

export function sentence(stem: string): string {
  const s = stem.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Aston Villa" -> ASTON VILLA, ASTON, VILLA, AV, AVFC: the ways a club prefixes its own codes. */
function clubPrefixes(club: string | null): Set<string> {
  const words = (club ?? "").toUpperCase().split(/\s+/).filter(Boolean);
  if (!words.length) return new Set();
  const initials = words.map((w) => w[0]).join("");
  return new Set([words.join(" "), ...words, initials, `${initials}FC`]);
}

export type Side = "ours" | "theirs" | "neutral";
export type Placed = { side: Side; stem: string };

/** Whose each code is. "OPPOSITION X" / "OPP X" are theirs. A prefix P is ours when
 *  "P X" exists for some opposition X and P names our club, or P pairs with two or more
 *  opposition codes (which rules out one-offs like CONTESTED POSSESSION). Everything else
 *  is neutral, with the whole code as its stem. */
export function codeSides(moments: HudlMoment[], club: string | null): (code: string) => Placed {
  const counts = situations(moments);
  const theirs = new Set<string>();
  for (const code of counts.keys()) {
    const stem = THEIRS.exec(code)?.[1].toUpperCase();
    if (stem) theirs.add(stem);
  }
  const named = clubPrefixes(club);
  const pairs = new Map<string, Set<string>>();
  for (const code of counts.keys()) {
    if (THEIRS.test(code)) continue;
    const upper = code.toUpperCase();
    for (const stem of theirs) {
      if (upper.length > stem.length + 1 && upper.endsWith(` ${stem}`)) {
        const prefix = upper.slice(0, -(stem.length + 1));
        pairs.set(prefix, (pairs.get(prefix) ?? new Set()).add(stem));
      }
    }
  }
  const prefixes = [...new Set([...named].filter((p) => p.includes(" ") || p.endsWith("FC")).concat(
    [...pairs].filter(([p, stems]) => named.has(p) || stems.size >= 2).map(([p]) => p),
  ))].sort((a, b) => b.length - a.length);
  return (code) => {
    const upper = code.toUpperCase().trim();
    const stem = THEIRS.exec(upper)?.[1];
    if (stem) return { side: "theirs", stem };
    const prefix = prefixes.find((p) => upper.startsWith(`${p} `));
    return prefix ? { side: "ours", stem: upper.slice(prefix.length + 1) } : { side: "neutral", stem: upper };
  };
}

/** Splits a match's codes into our team and the opposition, paired by situation (see codeSides). */
export function teamProfile(moments: HudlMoment[], club: string | null): { axes: Axis[]; neutral: Kind[] } {
  const counts = situations(moments);
  const place = codeSides(moments, club);
  const ours = new Map<string, number>();
  const theirs = new Map<string, number>();
  const neutral: Kind[] = [];
  for (const [code, n] of counts) {
    const { side, stem } = place(code);
    if (side === "theirs") theirs.set(stem, (theirs.get(stem) ?? 0) + n);
    else if (side === "ours") ours.set(stem, (ours.get(stem) ?? 0) + n);
    else neutral.push({ name: code, count: n });
  }
  const axes = [...new Set([...ours.keys(), ...theirs.keys()])]
    .map((stem) => ({ name: sentence(stem), ours: ours.get(stem) ?? 0, theirs: theirs.get(stem) ?? 0 }))
    .sort((a, b) => b.ours + b.theirs - (a.ours + a.theirs) || b.ours - a.ours || a.name.localeCompare(b.name));
  return { axes, neutral: neutral.sort(byCount) };
}
