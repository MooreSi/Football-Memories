import type { VeoMatch } from "../api/veo";
import type { DownloadEntry } from "../api/hudl";
import { downloadState } from "../api/hudl";
import { fixtureDate } from "./hudlFixture";

/** Spec 280: which Veo matches still have video and are not saved, soonest to expire
 *  first. Veo publishes no expiry date, so it is estimated as the match date plus how
 *  long Veo keeps video (12 months on Team/Club plans, 6 on Starter; owner decision 010).
 *  Veo's own "expires-soon" always counts as 30 days or less. */
export type Band = "7" | "30" | "60" | "later" | "unknown";
export type AtRisk = { match: VeoMatch; date: Date | null; expires: Date | null; daysLeft: number | null; band: Band };
export type ExpiryQueue = { atRisk: AtRisk[]; lost: VeoMatch[]; saved: number };

const ACTIVE = new Set(["does-not-expire", "does-not-expire-soon", "expires-soon"]);
const DAY = 86_400_000;
const ORDER: Band[] = ["7", "30", "60", "later", "unknown"];

function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last));
}

function band(daysLeft: number | null, veoSaysSoon: boolean): Band {
  const fromDays: Band = daysLeft === null ? "unknown" : daysLeft <= 7 ? "7" : daysLeft <= 30 ? "30" : daysLeft <= 60 ? "60" : "later";
  return veoSaysSoon && (fromDays === "60" || fromDays === "later" || fromDays === "unknown") ? "30" : fromDays;
}

export function veoExpiryQueue(library: VeoMatch[], downloads: DownloadEntry[], retentionMonths: number, today: Date): ExpiryQueue {
  const state = downloadState(downloads);
  const isSaved = (m: VeoMatch) => state.get(m.id)?.match === true;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const atRisk: AtRisk[] = [];
  const lost: VeoMatch[] = [];
  let saved = 0;
  for (const match of library) {
    if (isSaved(match)) { saved += 1; continue; }
    if (match.expiration_status === "expired") { lost.push(match); continue; }
    if (!match.available || !ACTIVE.has(match.expiration_status ?? "")) continue;
    const date = fixtureDate(match.title);
    const expires = date ? addMonths(date, retentionMonths) : null;
    const daysLeft = expires ? Math.round((expires.getTime() - start.getTime()) / DAY) : null;
    atRisk.push({ match, date, expires, daysLeft, band: band(daysLeft, match.expiration_status === "expires-soon") });
  }
  atRisk.sort((a, b) => ORDER.indexOf(a.band) - ORDER.indexOf(b.band) || (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
  const time = (m: VeoMatch) => fixtureDate(m.title)?.getTime() ?? -Infinity;
  lost.sort((a, b) => time(b) - time(a));
  return { atRisk, lost, saved };
}
