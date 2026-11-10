import { useLocation } from "react-router-dom";
import { useArchiveFilters } from "../../lib/archiveFilters";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { hudlAgeGroups, hudlRequest, useHudlLibrary, useHudlStatus } from "../../api/hudl";
import { autoCheck } from "../../lib/hudlAutoCheck";

/** Owner request (2026-11-10): opening the app checks Hudl for new matches and records
 *  tag metadata for any match that has none. At most one check per app load. */
export function useHudlAutoCheck() {
  const status = useHudlStatus();
  const library = useHudlLibrary();
  const qc = useQueryClient();
  const {age}=useArchiveFilters();
  const {pathname}=useLocation();
  const done = useRef<string|null>(null);
  useEffect(() => {
    if (!status.data || !library.isFetched || pathname.startsWith("/hudl/") || pathname.startsWith("/clips")) return;
    const changedScope = status.data.syncing && status.data.tag_age_group !== age;
    if ((!changedScope && done.current===age) || (status.data.busy && !changedScope)) return;
    done.current = age;
    const action = changedScope ? "sync_tags" : autoCheck(status.data, age ? library.data?.filter(m=>hudlAgeGroups(m).includes(age)) : [], Date.now());
    if (action) {
      void hudlRequest("/account/action", { action, age_group:age })
        .then(() => qc.invalidateQueries({ queryKey: ["hudl-account"] }))
        .catch(() => undefined);
    }
  }, [status.data, library.isFetched, library.data, qc, age, pathname]);
}
