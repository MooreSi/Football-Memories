import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useVeoStatus, veoRequest } from "../../api/veo";
import { lastTried, markTried, useReturns, veoAutoCheck } from "../../lib/veoAutoCheck";

const TRIED = "fm.veo.autocheck.tried";

/** Owner request 2026-11-15: new Veo matches show in the library without pressing
 *  Refresh. Checked on opening, returning and while the app stays open, at most every six
 *  hours. Not on a Veo match page or Clips, where a refresh would stop the video. */
export function useVeoAutoCheck() {
  const status = useVeoStatus();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const returns = useReturns();
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") setMinute(n => n + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const done = useRef<string | null>(null);
  useEffect(() => {
    const check = `${returns}/${minute}`;
    if (!status.data || status.data.busy || done.current === check || pathname.startsWith("/veo/") || pathname.startsWith("/clips")) return;
    done.current = check;
    const now = Date.now();
    if (!veoAutoCheck(status.data, lastTried(TRIED), now)) return;
    markTried(TRIED, now);
    void veoRequest("/action", { action: "refresh" })
      .then(() => qc.invalidateQueries({ queryKey: ["veo-account"] }))
      .catch(() => undefined);
  }, [status.data, qc, pathname, returns, minute]);
}
