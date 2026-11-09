import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch, ImagePlus, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Button } from "../ui/Button";

/** Brief section 22: integrity verification, relinking moved files, rebuilding thumbnails. */
export function ArchiveTools() {
  const qc = useQueryClient();
  const verify = useQuery({
    queryKey: ["verify"],
    queryFn: api.verifyState,
    refetchInterval: (q) => (q.state.data?.state === "running" ? 1000 : false),
  });
  const start = useMutation({ mutationFn: api.startVerify, onSuccess: (s) => qc.setQueryData(["verify"], s) });
  const relink = useMutation({ mutationFn: api.relink, onSuccess: () => void qc.invalidateQueries() });
  const thumbs = useMutation({ mutationFn: api.rebuildThumbnails, onSuccess: () => void qc.invalidateQueries() });

  const v = verify.data;
  const problems = v?.results.filter((r) => r.result !== "ok") ?? [];
  const pct = v && v.total ? Math.round((v.checked / v.total) * 100) : 0;

  return (
    <section aria-label="Archive tools" className="panel space-y-5 p-5">
      <h2 className="font-semibold">Archive tools</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="tile space-y-3 p-4">
          <p className="flex items-center gap-2 font-medium"><FileSearch size={16} className="text-accent" aria-hidden /> Verify files</p>
          <p className="text-xs text-fg-muted">Re-reads every video and compares it with the fingerprint taken when it was imported. Large archives take a few minutes.</p>
          <Button onClick={() => start.mutate()} disabled={v?.state === "running" || start.isPending}>
            {v?.state === "running" ? "Checking" : "Verify all videos"}
          </Button>
          {v && v.state !== "idle" && (
            <div aria-live="polite" className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
              <p className="text-xs text-fg-muted">
                {v.checked} of {v.total} checked
                {v.state === "done" && (problems.length === 0 ? " · all intact" : ` · ${problems.length} need attention`)}
              </p>
              {problems.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {problems.map((r) => (
                    <li key={r.media_id} className="text-danger">
                      <Link to={`/matches/${r.match_id}`} className="underline">vs {r.opponent}</Link>:{" "}
                      {r.result === "missing" ? "file missing" : "file has changed since import"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="tile space-y-3 p-4">
          <p className="flex items-center gap-2 font-medium"><ScanSearch size={16} className="text-accent" aria-hidden /> Find moved files</p>
          <p className="text-xs text-fg-muted">If you moved or renamed videos inside the archive folder, this finds them by their fingerprint and reconnects them. Nothing is moved or copied.</p>
          <Button onClick={() => relink.mutate()} disabled={relink.isPending}>{relink.isPending ? "Searching" : "Find moved files"}</Button>
          {relink.data && (
            <p role="status" className="text-xs text-fg-muted">
              Reconnected {relink.data.relinked}; still missing {relink.data.still_missing}.
            </p>
          )}
        </div>

        <div className="tile space-y-3 p-4">
          <p className="flex items-center gap-2 font-medium"><ImagePlus size={16} className="text-accent" aria-hidden /> Rebuild thumbnails</p>
          <p className="text-xs text-fg-muted">Recreates any missing match thumbnails from the videos.</p>
          <Button onClick={() => thumbs.mutate()} disabled={thumbs.isPending}>{thumbs.isPending ? "Working" : "Rebuild missing"}</Button>
          {thumbs.data && (
            <p role="status" className="text-xs text-fg-muted">Rebuilt {thumbs.data.rebuilt}; could not rebuild {thumbs.data.failed}.</p>
          )}
        </div>
      </div>
    </section>
  );
}
