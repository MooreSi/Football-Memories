import { looksLikePlayer } from "./hudlPlayer";

const az = (a: string, b: string) => a.localeCompare(b, "en-GB", { sensitivity: "base" });

/** Owner request 2026-11-27: a match's codes with the players first, then the other
 *  moments, each alphabetical whatever the case. */
export function playersFirst(codes: string[]): { players: string[]; moments: string[] } {
  const unique = [...new Set(codes)];
  return { players: unique.filter(looksLikePlayer).sort(az), moments: unique.filter(c => !looksLikePlayer(c)).sort(az) };
}
