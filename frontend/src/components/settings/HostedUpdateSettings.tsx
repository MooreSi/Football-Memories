import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowUpCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { HOSTED } from "../../api/hostedFlag";
import { reloadPage } from "../../lib/reloadPage";
import { Button } from "../ui/Button";

/** Spec 340 / owner decision 013 (2026-11-20): a hosted library's updates. The gateway's host
 *  updater checks GitHub and builds each new version; this page only asks the gateway (same
 *  origin) what this library runs, moves it to the newest build, and saves the tick box. */
type HostedUpdate = { current: string | null; latest: string | null; available: boolean; auto_update: boolean; checked_at: string | null };
const KEY = ["hosted-update"];
const BASE = "/_portal/api/update";

async function send(path: string, body?: unknown): Promise<HostedUpdate> {
  const me = await fetch("/_portal/api/me", { credentials: "same-origin", cache: "no-store" });
  if (!me.ok) throw new Error("Please sign in again.");
  const { csrf_token } = (await me.json()) as { csrf_token: string };
  const r = await fetch(`${BASE}${path}`, {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf_token },
    body: JSON.stringify(body ?? {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "The update did not run. Try again later.");
  return data as HostedUpdate;
}

export function useHostedUpdate() {
  return useQuery<HostedUpdate>({
    queryKey: KEY, enabled: HOSTED, retry: false, refetchInterval: 15 * 60 * 1000,
    queryFn: async () => {
      const r = await fetch(BASE, { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error("Updates cannot be checked right now. Try again later.");
      return (await r.json()) as HostedUpdate;
    },
  });
}

/** After an update the library's containers restart: wait for the app to answer, then reload. */
function useReloadWhenBack(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    const timer = setInterval(async () => {
      const ok = await fetch("/api/health", { cache: "no-store" }).then((r) => r.ok, () => false);
      if (ok && !stopped) { stopped = true; clearInterval(timer); reloadPage(); }
    }, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [active]);
}

const short = (sha: string | null) => (sha ? sha.slice(0, 7) : "an earlier version");

export function HostedUpdateBadge() {
  const q = useHostedUpdate();
  if (!q.data?.available || q.data.auto_update) return null;
  return (
    <Link to="/settings/update" aria-label="Update available" className="update-badge inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-semibold">
      <ArrowUpCircle size={15} aria-hidden /> <span className="update-label">Update available</span>
    </Link>
  );
}

export function HostedUpdateSettings() {
  const qc = useQueryClient();
  const q = useHostedUpdate();
  const [updated, setUpdated] = useState(false);
  const apply = useMutation({ mutationFn: () => send("/apply"),
    onSuccess: (data) => { qc.setQueryData(KEY, data); setUpdated(true); } });
  const auto = useMutation({ mutationFn: (enabled: boolean) => send("/auto", { enabled }),
    onSuccess: (data) => qc.setQueryData(KEY, data) });
  useReloadWhenBack(updated);
  const data = q.data;
  return (
    <section aria-label="Update" className="panel max-w-3xl space-y-4 p-5">
      <h2 className="text-lg font-semibold">Update</h2>
      {q.isPending ? <p className="text-sm text-fg-muted">Checking for a newer version…</p> : q.isError ? (
        <p className="text-sm text-fg-muted">{q.error.message}</p>
      ) : data && (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-fg-muted">This library</dt><dd><code>{short(data.current)}</code></dd>
            <dt className="text-fg-muted">Latest version</dt>
            <dd>{data.latest ? <code>{data.latest.slice(0, 7)}</code> : <span className="text-fg-muted">not checked yet</span>}
              {data.checked_at && <span className="text-fg-subtle"> · checked {new Date(data.checked_at).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>}</dd>
          </dl>
          {updated ? null : data.available ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
              <ArrowUpCircle size={20} className="text-accent" aria-hidden />
              <p className="mr-auto text-sm">A newer version of Football Memories is ready.</p>
              <Button variant="primary" disabled={apply.isPending} onClick={() => apply.mutate()}>Update now</Button>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ok"><CheckCircle2 size={16} aria-hidden /> Your library is up to date.</p>
          )}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" aria-label="Update automatically" className="h-4 w-4 accent-[var(--color-accent)]"
              checked={data.auto_update} disabled={auto.isPending} onChange={(e) => auto.mutate(e.target.checked)} />
            Update automatically when a newer version is ready
          </label>
        </>
      )}
      {(apply.isPending || updated) && (
        <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
          <RefreshCw size={14} className="animate-spin" aria-hidden />
          {apply.isPending ? "Updating your library…" : "Restarting your library… this page reloads by itself when it is ready."}
        </p>
      )}
      {(apply.isError || auto.isError) && <p role="alert" className="text-sm text-danger">{(apply.error ?? auto.error)?.message}</p>}
      <p className="text-xs text-fg-subtle">New versions come from the Football Memories project on GitHub and are checked about every hour. Updating restarts your library on the new version; your matches, downloads and settings are kept.</p>
    </section>
  );
}
