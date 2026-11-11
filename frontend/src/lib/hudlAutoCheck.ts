import type { HudlMatch, HudlStatus } from "../api/hudl";

/** Re-read the Hudl match list at most this often when the app opens (owner decision 003). */
export const RECHECK_MS = 6 * 3600 * 1000;

/** What to start when the app opens: look for new matches, record missing tags, or nothing. */
export function autoCheck(status: HudlStatus | undefined, library: HudlMatch[] | undefined, now: number): "refresh" | "sync_tags" | null {
  if (!status?.configured || status.busy || status.syncing) return null;
  const checked = status.catalogue_checked_at;
  if (checked == null || now - checked * 1000 > RECHECK_MS) return "refresh";
  if ((library ?? []).some((m) => !m.tag_status && !m.moments?.length)) return "sync_tags";
  // Owner report 2026-11-11: indexed matches still showing Hudl's small thumbnail.
  const week = 7 * 86400 * 1000;
  if ((library ?? []).some((m) => m.tag_status && m.tag_status !== "unavailable" && !m.poster_url
    && !(m.poster_checked_at && now - m.poster_checked_at * 1000 < week))) return "sync_tags";
  return null;
}
