import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { hudlRequest } from "../../api/hudl";
import { reloadPage } from "../../lib/reloadPage";
import { Button } from "../ui/Button";

type Check = { current: string; latest: string; behind: number; update_available: boolean; latest_message: string; latest_date: string | null };
type Status = { state: "idle" | "working" | "done" | "error"; message: string };
const SIX_HOURS = 6 * 60 * 60 * 1000;
const POLL_MS = 2000;
const GIVE_UP_MS = 30 * 60 * 1000;

/**
 * Owner request 2026-11-12: after Update now, wait until the helper has restarted on the
 * new commit and the app answers again, then reload the page onto the new version.
 * The helper is unreachable while it restarts, so failed polls just mean "keep waiting".
 */
function useReloadAfterUpdate(from: string | null, onError: (message: string) => void) {
  const [phase, setPhase] = useState<"idle" | "working" | "restarting" | "slow">("idle");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!from) return;
    setPhase("working");
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      let status: Status | null = null;
      try { status = await hudlRequest<Status>("/update/status"); } catch { /* helper restarting */ }
      if (stopped) return;
      if (status?.state === "error") { stopped = true; setPhase("idle"); onError(status.message); return; }
      if (status?.state === "working") { setMessage(status.message); setPhase("working"); }
      else setPhase("restarting");
      let current: string | null = null;
      try { current = (await hudlRequest<{ current: string }>("/update/version")).current; } catch { /* restarting */ }
      if (current && current !== from) {
        const healthy = await fetch("/api/health").then((r) => r.ok, () => false);
        if (healthy && !stopped) { stopped = true; reloadPage(); return; }
      }
      if (Date.now() - started > GIVE_UP_MS) { stopped = true; setPhase("slow"); }
    };
    void tick();
    const timer = setInterval(() => { if (!stopped) void tick(); }, POLL_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [from]);
  return { phase, message };
}

/** Spec 190: compares this copy with GitHub main through the desktop helper, which also links a copy downloaded as a ZIP to GitHub on its first check. */
export function useUpdateCheck() {
  return useQuery<Check>({ queryKey: ["app-update"], queryFn: () => hudlRequest("/update/check"), retry: false,
    staleTime: SIX_HOURS, refetchInterval: SIX_HOURS, refetchOnWindowFocus: false });
}

export function UpdateBadge() {
  const q = useUpdateCheck();
  if (!q.data?.update_available) return null;
  return (
    <Link to="/settings/update" aria-label="Update available" className="update-badge inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-semibold">
      <ArrowUpCircle size={15} aria-hidden /> <span className="update-label">Update available</span>
    </Link>
  );
}

export function UpdateSettings() {
  const qc = useQueryClient();
  const check = useUpdateCheck();
  const status = useQuery<Status>({ queryKey: ["app-update-status"], queryFn: () => hudlRequest("/update/status"), retry: false,
    refetchInterval: (q) => (q.state.data?.state === "working" ? 2000 : false) });
  const recheck = useMutation({
    mutationFn: () => hudlRequest<Check>("/update/check?force=true"),
    onSuccess: (data) => qc.setQueryData(["app-update"], data),
  });
  const [updatingFrom, setUpdatingFrom] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const apply = useMutation({
    mutationFn: () => hudlRequest("/update/apply", {}),
    onMutate: () => setFailure(""),
    onSuccess: () => setUpdatingFrom(check.data?.current ?? null),
  });
  const progress = useReloadAfterUpdate(updatingFrom, (message) => { setFailure(message); setUpdatingFrom(null); });
  const updating = updatingFrom !== null;
  const data = check.data;
  const state = status.data?.state;

  return (
    <section aria-label="Update" className="panel max-w-3xl space-y-4 p-5">
      <h2 className="text-lg font-semibold">Update</h2>
      {check.isPending ? <p className="text-sm text-fg-muted">Checking GitHub for the latest version…</p> : check.isError ? (
        <div className="space-y-2 text-sm text-fg-muted">
          <p>{(check.error as Error & { status?: number }).status === 400 ? check.error.message : "The desktop helper is not running, so this copy cannot check GitHub from here."}</p>
          <p>To update, double-click <strong className="text-fg">Install Football Memories.command</strong> (Mac) or <strong className="text-fg">Install Football Memories.bat</strong> (Windows) in the app folder. It downloads the latest version, rebuilds the app and opens it.</p>
        </div>
      ) : data && (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-fg-muted">This copy</dt><dd><code>{data.current.slice(0, 7)}</code></dd>
            <dt className="text-fg-muted">Latest on GitHub</dt>
            <dd><code>{data.latest.slice(0, 7)}</code> {data.latest_message && <span className="text-fg-muted">· {data.latest_message}</span>}
              {data.latest_date && <span className="text-fg-subtle"> · {new Date(data.latest_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>}</dd>
          </dl>
          {data.update_available ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <ArrowUpCircle size={20} className="text-accent" aria-hidden />
              <p className="mr-auto text-sm">{data.behind} {data.behind === 1 ? "update" : "updates"} available.</p>
              <Button variant="primary" disabled={apply.isPending || updating || state === "working"} onClick={() => apply.mutate()}>Update now</Button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle2 size={16} aria-hidden /> Football Memories is up to date.</p>
          )}
        </>
      )}
      {updating ? (
        <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
          <RefreshCw size={14} className="animate-spin" aria-hidden />
          {progress.phase === "slow" ? "The update is taking longer than expected. Reload this page in a minute, or run the installer again."
            : progress.phase === "restarting" ? "Restarting the app… this page reloads by itself when the new version is ready."
            : `${progress.message || "Downloading the latest version…"} This page reloads by itself when it is done.`}
        </p>
      ) : failure ? <p role="status" className="text-sm text-danger">{failure}</p>
        : state && state !== "idle" && <p role="status" className={`text-sm ${state === "error" ? "text-danger" : state === "done" ? "text-ok" : "text-fg-muted"}`}>{status.data?.message}</p>}
      {(apply.isError || recheck.isError) && <p role="alert" className="text-sm text-danger">{(apply.error ?? recheck.error)?.message}</p>}
      {!check.isError && <Button variant="ghost" disabled={recheck.isPending} onClick={() => recheck.mutate()}><RefreshCw size={14} aria-hidden /> Check now</Button>}
      <p className="text-xs text-fg-subtle">Updating only fast-forwards to the latest version on GitHub, rebuilds the app, restarts it and reloads this page. Your matches, downloads, settings and database are kept. A copy with local code changes is never overwritten. A copy downloaded as a ZIP is linked to GitHub the first time it checks, without changing any file.</p>
    </section>
  );
}
