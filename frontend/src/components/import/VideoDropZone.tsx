import { useMutation } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";
import type { InboxFile } from "../../api/types";
import { uploadVideo } from "../../api/upload";
import { FILL_CLASS } from "../match/statsUi";

// The importer's video types (backend importer.VIDEO_EXTENSIONS).
const VIDEO = /\.(mp4|mov|m4v|mkv|avi|mts|m2ts|webm)$/i;

/** Owner request 2026-11-14: drop a match video on the box, or click it to choose one.
 *  The file is saved in the import folder (uploaded/), never replacing a file. */
export function VideoDropZone({ onUploaded }: { onUploaded: (file: InboxFile) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (file: File) => { setProgress(0); return uploadVideo(file, setProgress); },
    onSuccess: onUploaded,
  });
  const take = (file: File | undefined) => {
    if (!file || send.isPending) return;
    if (!VIDEO.test(file.name)) { setRefused("Choose a video file (.mp4, .mov, .mkv and similar)."); return; }
    setRefused(null);
    send.mutate(file);
  };
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); };
  const error = refused ?? (send.error as Error | null)?.message;
  return (
    <div className="space-y-2">
      <div role="button" tabIndex={0} aria-label="Drop a match video here, or click to choose one" aria-disabled={send.isPending}
        onClick={() => !send.isPending && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !send.isPending) { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
        className={`panel flex cursor-pointer flex-col items-center gap-3 border-2 border-dashed p-8 text-center transition ${over ? "border-accent bg-accent/10" : "border-white/15 hover:border-accent/50"}`}>
        <Upload size={28} className="text-accent" aria-hidden />
        <div>
          <p className="font-medium">Drop a match video here</p>
          <p className="mt-1 text-sm text-fg-muted">.mp4, .mov, .mkv and similar. It is saved in the import folder, then you add the match details.</p>
        </div>
        <span className="inline-flex h-10 items-center rounded-full bg-gradient-to-r from-[#2563eb] to-accent-strong px-5 text-sm font-semibold text-white">Choose a video</span>
        <input ref={input} type="file" accept="video/*,.mkv,.mts,.m2ts" aria-label="Choose a video file" className="sr-only"
          onClick={(e) => e.stopPropagation()} onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {send.isPending && (
        <div className="space-y-1" aria-live="polite">
          <p className="text-sm text-fg-muted">Uploading… {Math.round(progress * 100)}%. Keep this page open.</p>
          <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
            className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className={`block h-full ${FILL_CLASS} transition-all`} style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
