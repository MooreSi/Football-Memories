import { useLocation } from "react-router-dom";
import { useArchiveFilters } from "../../lib/archiveFilters";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { hudlAgeGroups, hudlRequest, useHudlLibrary, useHudlStatus } from "../../api/hudl";
import { autoCheck } from "../../lib/hudlAutoCheck";
import { lastTried, markTried, useReturns } from "../../lib/veoAutoCheck";

const TRIED = "fm.hudl.autocheck.tried";

/** Owner request (2026-11-10): opening the app checks Hudl for new matches and records
 *  tag metadata for any match that has none. Owner request 2026-11-15: also on coming
 *  back to the app, so new matches appear without reloading; still at most one list
 *  re-read per six hours. */
export function useHudlAutoCheck() {
  const status = useHudlStatus();
  const library = useHudlLibrary();
  const qc = useQueryClient();
  const {age}=useArchiveFilters();
  const {pathname}=useLocation();
  const returns = useReturns();
  const done = useRef<string|null>(null);
  useEffect(() => {
    if (!status.data || !library.isFetched || pathname.startsWith("/hudl/") || pathname.startsWith("/clips")) return;
    const changedScope = status.data.syncing && status.data.tag_age_group !== age;
    if ((!changedScope && done.current===`${age}/${returns}`) || (status.data.busy && !changedScope)) return;
    done.current = `${age}/${returns}`;
    const now = Date.now();
    const found = changedScope ? "sync_tags" : autoCheck(status.data, age ? library.data?.filter(m=>hudlAgeGroups(m).includes(age)) : [], now, lastTried(TRIED));
    // Coming back only re-reads an old list (which indexes new matches after); the tag
    // sweep for older gaps stays once per app load, as before.
    const action = returns > 0 && !changedScope && found === "sync_tags" ? null : found;
    if (action === "refresh") markTried(TRIED, now);
    if (action) {
      void hudlRequest("/account/action", { action, age_group:age })
        .then(() => qc.invalidateQueries({ queryKey: ["hudl-account"] }))
        .catch(() => undefined);
    }
  }, [status.data, library.isFetched, library.data, qc, age, pathname, returns]);
}
