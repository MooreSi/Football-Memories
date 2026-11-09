import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, History, RotateCcw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../../api/client";
import type { BackupInfo } from "../../api/types";
import { formatBytes } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

const KIND: Record<BackupInfo["kind"], { label: string; tone: "accent" | "neutral" | "warn" | "violet" }> = {
  manual: { label: "Manual", tone: "accent" },
  auto: { label: "Automatic", tone: "neutral" },
  "pre-restore": { label: "Before restore", tone: "warn" },
  uploaded: { label: "Uploaded", tone: "violet" },
};

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function RestorePanel({ backup, onDone, onCancel }: { backup: BackupInfo; onDone: (safety: string) => void; onCancel: () => void }) {
  const [typed, setTyped] = useState("");
  const restore = useMutation({ mutationFn: () => api.restoreBackup(backup.name), onSuccess: (r) => onDone(r.safety_backup) });
  return (
    <div role="dialog" aria-label={`Restore ${backup.name}`} className="mt-3 space-y-3 rounded-xl border border-warn/40 bg-warn/5 p-4">
      <p className="text-sm">
        Restoring replaces all matches, tags, favourites, playlists and settings with this backup from{" "}
        <strong>{when(backup.created_at)}</strong> ({backup.matches} matches, {backup.moments} moments). Video files are not
        touched. A backup of how things are now is saved first, so you can undo this.
      </p>
      <label className="block text-sm">
        Type <code className="text-warn">RESTORE</code> to confirm
        <input className="field mt-1 max-w-xs" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type RESTORE to confirm" />
      </label>
      <div className="flex gap-2">
        <Button variant="primary" disabled={typed !== "RESTORE" || restore.isPending} onClick={() => restore.mutate()}>
          <RotateCcw size={14} aria-hidden /> {restore.isPending ? "Restoring" : "Restore this backup"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      {restore.isError && <p role="alert" className="text-sm text-danger">{(restore.error as Error).message}</p>}
    </div>
  );
}

/** Brief section 22: backups and restore. */
export function BackupSettings() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["backups"], queryFn: api.backups });
  const [restoring, setRestoring] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = () => void qc.invalidateQueries({ queryKey: ["backups"] });

  const create = useMutation({ mutationFn: api.createBackup, onSuccess: (b) => { setNotice(`Backup saved: ${b.name}`); refresh(); } });
  const upload = useMutation({ mutationFn: (f: File) => api.uploadBackup(f), onSuccess: (b) => { setNotice(`Uploaded as ${b.name}. Restore it below when ready.`); refresh(); } });
  const remove = useMutation({ mutationFn: (name: string) => api.deleteBackup(name), onSuccess: refresh });
  const error = (create.error ?? upload.error ?? remove.error) as Error | null;

  return (
    <div className="space-y-6">
      <section aria-label="Back up" className="panel grid gap-5 p-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck size={18} className="text-accent" aria-hidden /> Backups</h2>
          <p className="text-sm text-fg-muted">
            A backup saves every match, tag, player, favourite, playlist and setting. One is made automatically each day
            the app is running (the newest 14 are kept). Backups are stored in your archive folder under{" "}
            <code className="text-fg">FootballMemories/Backups</code>.
          </p>
          <p className="text-sm text-warn">
            Videos are not inside a backup file. Keep a copy of the whole archive folder too (Time Machine or an external
            drive) to protect the footage itself.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Button variant="primary" onClick={() => create.mutate()} disabled={create.isPending}>
            <Archive size={15} aria-hidden /> {create.isPending ? "Saving" : "Back up now"}
          </Button>
          <input ref={fileInput} type="file" accept="application/json,.json" aria-label="Upload a backup file" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            <Upload size={15} aria-hidden /> Upload a backup
          </Button>
        </div>
        {(notice || error) && (
          <p role={error ? "alert" : "status"} className={`text-sm lg:col-span-2 ${error ? "text-danger" : "text-ok"}`}>
            {error ? error.message : notice}
          </p>
        )}
      </section>

      <section aria-label="Saved backups" className="panel p-6">
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><History size={17} className="text-accent" aria-hidden /> Saved backups</h2>
        {list.isPending ? (
          <Spinner />
        ) : !list.data?.length ? (
          <p className="text-sm text-fg-muted">No backups yet. Press Back up now to make the first one.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {list.data.map((b) => (
              <li key={b.name} className="py-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {when(b.created_at)} <Badge tone={KIND[b.kind].tone}>{KIND[b.kind].label}</Badge>
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {b.matches} matches · {b.moments} moments · {formatBytes(b.size_bytes)} · <span className="font-mono">{b.name}</span>
                    </p>
                  </div>
                  <a href={`/api/backups/${encodeURIComponent(b.name)}`} download className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-fg-muted hover:bg-white/5 hover:text-fg">
                    <Download size={14} aria-hidden /> Download
                  </a>
                  <Button variant="subtle" onClick={() => setRestoring(restoring === b.name ? null : b.name)} aria-expanded={restoring === b.name}>
                    <RotateCcw size={14} aria-hidden /> Restore
                  </Button>
                  <Button variant="ghost" aria-label={`Delete backup ${b.name}`}
                    onClick={() => { if (window.confirm(`Delete the backup from ${when(b.created_at)}? This cannot be undone.`)) remove.mutate(b.name); }}>
                    <Trash2 size={14} aria-hidden />
                  </Button>
                </div>
                {restoring === b.name && (
                  <RestorePanel
                    backup={b}
                    onCancel={() => setRestoring(null)}
                    onDone={(safety) => {
                      setRestoring(null);
                      setNotice(`Restored. The previous state was saved as ${safety}; restore that to undo.`);
                      void qc.invalidateQueries();
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
