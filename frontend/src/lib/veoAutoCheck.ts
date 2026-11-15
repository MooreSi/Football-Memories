import { useEffect, useState } from "react";
import type { VeoStatus } from "../api/veo";
import { RECHECK_MS } from "./hudlAutoCheck";

/** Owner request 2026-11-15: read the Veo match list on its own when it is over six
 *  hours old (the Hudl rule, owner decision 003). `tried`: when this browser last
 *  asked, so a failed refresh is not repeated within six hours. */
export function veoAutoCheck(status: VeoStatus | undefined, tried: number | null, now: number): boolean {
  if (!status?.configured || status.busy) return false;
  const checked = status.library_checked_at;
  const stale = checked == null || now - checked * 1000 > RECHECK_MS;
  return stale && (tried == null || now - tried > RECHECK_MS);
}

/** When this browser last asked a source to re-read its list (per browser, best effort). */
export function lastTried(key: string): number | null {
  try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
}
export function markTried(key: string, now: number): void {
  try { localStorage.setItem(key, String(now)); } catch { /* private window: the six-hour list age still applies */ }
}

/** A number that goes up each time the owner comes back to the app's tab. */
export function useReturns(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const back = () => { if (document.visibilityState !== "hidden") setN(x => x + 1); };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => { document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, []);
  return n;
}
