import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { hudlRequest, useHudlLibrary, useHudlStatus } from "../../api/hudl";
import { autoCheck } from "../../lib/hudlAutoCheck";

/** Owner request (2026-11-10): opening the app checks Hudl for new matches and records
 *  tag metadata for any match that has none. At most one check per app load. */
export function useHudlAutoCheck() {
  const status = useHudlStatus();
  const library = useHudlLibrary();
  const qc = useQueryClient();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !status.data || !library.isFetched) return;
    done.current = true;
    const action = autoCheck(status.data, library.data, Date.now());
    if (action) {
      void hudlRequest("/account/action", { action })
        .then(() => qc.invalidateQueries({ queryKey: ["hudl-account"] }))
        .catch(() => undefined);
    }
  }, [status.data, library.isFetched, library.data, qc]);
}
