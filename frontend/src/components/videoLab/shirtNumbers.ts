import type { Review } from "./labTypes";

/** Shirt numbers on the 2D pitch (owner request 26 November 2026). The worker's dense reader
 * (`jersey_candidates.json`) gives unconfirmed per-tracklet hints; your corrections are saved in
 * the review (`shirt_numbers`): a number replaces the reading, null means "no number". */
export type ShirtCandidate = { track_id: number; number: number; votes?: number; confidence?: number };
export type ShirtCorrection = { track_id: number; number: number | null };
export type ShirtNumber = { number: number; source: "you" | "read" };

const shirt = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 99;

export const isShirtCandidates = (v: unknown): v is ShirtCandidate[] =>
  Array.isArray(v) && v.every(c => !!c && typeof c === "object" && Number.isInteger((c as ShirtCandidate).track_id) && shirt((c as ShirtCandidate).number));

export function shirtNumbers(read: ShirtCandidate[] = [], yours: ShirtCorrection[] = []): Map<number, ShirtNumber> {
  const out = new Map<number, ShirtNumber>();
  for (const c of read) out.set(c.track_id, { number: c.number, source: "read" });
  for (const c of yours) { if (c.number === null) out.delete(c.track_id); else out.set(c.track_id, { number: c.number, source: "you" }); }
  return out;
}

/** Your number for one person: a number, null for "no number", undefined to use the reading again. */
export function setShirtNumber(review: Review, track: number, number: number | null | undefined): Review {
  const rest = (review.shirt_numbers ?? []).filter(n => n.track_id !== track);
  return { ...review, shirt_numbers: number === undefined ? rest : [...rest, { track_id: track, number }] };
}
