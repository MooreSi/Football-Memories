import type { HudlMatch, HudlStatus } from "../api/hudl";

/** Re-read the Hudl match list at most this often when the app opens (owner decision 003). */
export const RECHECK_MS = 6 * 3600 * 1000;

/** What to start when the app opens: look for new matches, record missing tags, or nothing. */
export function autoCheck(status: HudlStatus | undefined, library: HudlMatch[] | undefined, now: number): "refresh" | "sync_tags" | null {
  if (!status?.configured || status.busy || status.syncing) return null;
  const checked = status.catalogue_checked_at;
  if (checked == null || now - checked * 1000 > RECHECK_MS) return "refresh";
  if ((library ?? []).some((m) => !m.tag_status && !m.moments?.length)) return "sync_tags";
  return null;
}
