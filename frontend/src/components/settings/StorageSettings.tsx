import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FolderOpen, HardDrive, RefreshCw, TriangleAlert, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { FolderHealth } from "../../api/types";
import { formatBytes, formatDate } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { ArchiveTools } from "./ArchiveTools";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

const TITLES = { archive: "Archive folder", inbox: "Import folder" } as const;
const ROLES = {
  archive: "Where the app keeps every match, thumbnail and photo. The app needs to write here.",
  inbox: "Where you drop match videos to import. The app only reads it and never changes your files.",
} as const;

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-fg" : "text-danger"}`}>
      {ok ? <CheckCircle2 size={15} className="text-ok" aria-hidden /> : <XCircle size={15} aria-hidden />}
      {label}
      <span className="sr-only">{ok ? "yes" : "no"}</span>
    </li>
  );
}

function FolderCard({ f }: { f: FolderHealth }) {
  const used = f.total_bytes && f.free_bytes != null ? 1 - f.free_bytes / f.total_bytes : null;
  const tone = f.status === "ok" ? "ok" : f.status === "warning" ? "warn" : "danger";
  return (
    <section aria-label={TITLES[f.role]} className="panel space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-ink-800 text-accent"><FolderOpen size={20} aria-hidden /></span>
          <div>
            <h2 className="font-semibold">{TITLES[f.role]}</h2>
            <p className="font-mono text-xs break-all text-fg-subtle">{f.path}</p>
          </div>
        </div>
        <Badge tone={tone}>{f.status === "ok" ? "Healthy" : f.status === "warning" ? "Warning" : "Problem"}</Badge>
      </div>
      <p className="text-sm text-fg-muted">{ROLES[f.role]}</p>
      <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <Check ok={f.exists} label="Exists" />
        <Check ok={f.readable} label="Readable" />
        {f.role === "archive" ? <Check ok={f.writable} label="Writable" /> : <li className="text-fg-subtle">Read-only is fine</li>}
      </ul>
      {used != null && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-fg-muted">
            <span>{formatBytes(f.free_bytes!)} free</span>
            <span>{formatBytes(f.total_bytes!)} disk</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${used > 0.95 ? "bg-danger" : used > 0.85 ? "bg-warn" : "bg-gradient-to-r from-ok to-accent"}`} style={{ width: `${Math.round(used * 100)}%` }} />
          </div>
        </div>
      )}
      <ul className="space-y-1 text-sm">
        {f.messages.map((m) => (
          <li key={m} className={`flex gap-2 ${f.status === "ok" ? "text-fg-muted" : f.status === "warning" ? "text-warn" : "text-danger"}`}>
            {f.status !== "ok" && <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />} {m}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Brief sections 13 and 22: folder checks, free space and missing-file detection. */
export function StorageSettings() {
  const q = useQuery({ queryKey: ["storage-health"], queryFn: api.storageHealth });
  if (q.isPending) return <Spinner label="Checking storage" />;
  if (q.isError) return <p role="alert" className="text-sm text-danger">{(q.error as Error).message}</p>;
  const { folders, archive } = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-fg-muted">
          These folders are on the computer running Football Memories, not in your browser. In Docker they are set in the
          <code className="mx-1 text-fg">.env</code> file (<code className="text-fg">FM_HOST_ARCHIVE</code>,{" "}
          <code className="text-fg">FM_HOST_INBOX</code>); see DEVELOPMENT.md.
        </p>
        <Button onClick={() => void q.refetch()} disabled={q.isFetching}><RefreshCw size={14} aria-hidden /> Check again</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {folders.map((f) => <FolderCard key={f.role} f={f} />)}
      </div>

      <ArchiveTools />

      <section aria-label="Archive contents" className="panel space-y-4 p-5">
        <div className="flex items-center gap-3">
          <HardDrive size={18} className="text-accent" aria-hidden />
          <h2 className="font-semibold">Archive contents</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="tile p-4"><p className="text-xs text-fg-muted">Video files</p><p className="text-2xl font-semibold">{archive.indexed_files}</p></div>
          <div className="tile p-4"><p className="text-xs text-fg-muted">Size</p><p className="text-2xl font-semibold">{formatBytes(archive.indexed_bytes)}</p></div>
          <div className="tile p-4"><p className="text-xs text-fg-muted">Missing</p><p className={`text-2xl font-semibold ${archive.missing.length ? "text-danger" : "text-ok"}`}>{archive.missing.length}</p></div>
        </div>
        {archive.missing.length === 0 ? (
          <p className="text-sm text-fg-muted">Every indexed video is where it should be.</p>
        ) : (
          <div>
            <p className="mb-2 text-sm text-danger">
              These matches are indexed but their video file is missing. Put the file back at the path shown and press
              Check again. Nothing has been deleted from the index.
            </p>
            <ul className="divide-y divide-white/5 text-sm">
              {archive.missing.map((x) => (
                <li key={x.media_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <Link to={`/matches/${x.match_id}`} className="font-medium hover:text-accent">vs {x.opponent}</Link>
                  <span className="text-xs text-fg-subtle">{formatDate(x.match_date)}</span>
                  <code className="w-full text-xs break-all text-fg-subtle">{x.relative_path}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
