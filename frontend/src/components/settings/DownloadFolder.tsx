import { Overlay } from "../ui/Overlay";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FolderInput, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { type DownloadFolderInfo, hudlRequest, useDownloadFolder, useHudlStatus } from "../../api/hudl";
import { formatBytes } from "../../lib/format";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

/** Owner request 2026-11-10: choose where downloads are saved, and delete them (to the Trash). */
export function DownloadFolderSettings() {
  const q = useDownloadFolder();
  const windows = useHudlStatus().data?.platform === "windows";
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<string>();
  const save = (data: DownloadFolderInfo) => qc.setQueryData(["hudl-downloads"], data);
  const folder = useMutation({
    mutationFn: (action: "choose" | "reset") => hudlRequest<DownloadFolderInfo>("/downloads/folder", { action }),
    onSuccess: save,
  });
  const remove = useMutation({
    mutationFn: (name: string) => hudlRequest<DownloadFolderInfo>("/downloads/delete", { name }),
    onSuccess: save,
  });
  const error = (folder.error || remove.error) as Error | null;

  return (
    <section aria-label="Downloaded files" className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-ink-800 text-accent"><Download size={20} aria-hidden /></span>
        <div className="mr-auto min-w-0">
          <h2 className="font-semibold">Downloaded files</h2>
          <p className="text-sm text-fg-muted">Where full matches and moment downloads from Hudl are saved on this computer. Files you have already downloaded stay where they are.</p>
        </div>
      </div>
      {q.isPending ? <Spinner label="Checking download folder" /> : q.isError ? (
        <p role="alert" className="text-sm text-warn">The desktop helper is not running, so the download folder cannot be shown. Start it (see Settings → Connections) and reload.</p>
      ) : (
        <>
          <div className="tile flex flex-wrap items-center gap-3 p-4">
            <div className="mr-auto min-w-0">
              <p className="font-mono text-xs break-all">{q.data.folder}</p>
              <p className="mt-1 text-xs text-fg-subtle">
                {q.data.is_default ? "Default folder (the app's Import folder)" : "Custom folder. Import only reads the default folder, so copy a match there to import it."}
                {q.data.free_bytes != null && ` · ${formatBytes(q.data.free_bytes)} free`}
              </p>
            </div>
            <Button disabled={folder.isPending} onClick={() => folder.mutate("choose")}><FolderInput size={14} aria-hidden /> {folder.isPending ? (windows ? "Choose in File Explorer…" : "Choose in Finder…") : "Change folder"}</Button>
            {!q.data.is_default && <Button variant="ghost" disabled={folder.isPending} onClick={() => folder.mutate("reset")}><RotateCcw size={14} aria-hidden /> Use default folder</Button>}
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error.message}</p>}
          {q.data.files.length === 0 ? <p className="text-sm text-fg-muted">No downloaded files in this folder.</p> : (
            <ul className="divide-y divide-white/5 text-sm">
              {q.data.files.map((f) => (
                <li key={f.name} aria-label={f.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="mr-auto min-w-0 break-all">{f.name}</span>
                  <span className="text-xs text-fg-subtle tabular-nums">{new Date(f.modified * 1000).toLocaleDateString()}</span>
                  <span className="w-20 text-right text-xs text-fg-muted tabular-nums">{formatBytes(f.size)}</span>
                  <Button variant="ghost" disabled={remove.isPending} onClick={() => setConfirm(f.name)}><Trash2 size={14} aria-hidden /> Delete</Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {confirm && (
        <Overlay label={`Delete ${confirm}?`} onClose={() => setConfirm(undefined)}>
            <h2 className="text-lg font-semibold break-all">Delete {confirm}?</h2>
            <p className="text-sm text-fg-muted">{windows ? "The file moves to the Recycle Bin, so you can restore it until the Recycle Bin is emptied." : "The file moves to the Mac's Trash, so you can put it back from Finder until the Trash is emptied."} Matches already imported into the Library keep their own copy. If you have not imported it, this may be your only copy.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(undefined)}>Cancel</Button>
              <Button variant="primary" onClick={() => { remove.mutate(confirm); setConfirm(undefined); }}><Trash2 size={14} aria-hidden /> {windows ? "Move to Recycle Bin" : "Move to Trash"}</Button>
            </div>
        </Overlay>
      )}
    </section>
  );
}
