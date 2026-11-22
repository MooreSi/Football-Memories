import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useVeoStatus, veoRequest } from "../../api/veo";
import { lastTried, markTried, useReturns, veoAutoCheck } from "../../lib/veoAutoCheck";

const TRIED = "fm.veo.autocheck.tried";

/** Owner request 2026-11-15: new Veo matches show in the library without pressing
 *  Refresh. Checked on opening the app and on coming back to it, at most every six
 *  hours. Not on a Veo match page or Clips, where a refresh would stop the video. */
export function useVeoAutoCheck() {
  const status = useVeoStatus();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const returns = useReturns();
  const done = useRef<number | null>(null);
  useEffect(() => {
    if (!status.data || status.data.busy || done.current === returns || pathname.startsWith("/veo/") || pathname.startsWith("/clips")) return;
    done.current = returns;
    const now = Date.now();
    if (!veoAutoCheck(status.data, lastTried(TRIED), now)) return;
    markTried(TRIED, now);
    void veoRequest("/action", { action: "refresh", only_missing: true })
      .then(() => qc.invalidateQueries({ queryKey: ["veo-account"] }))
      .catch(() => undefined);
  }, [status.data, qc, pathname, returns]);
}
