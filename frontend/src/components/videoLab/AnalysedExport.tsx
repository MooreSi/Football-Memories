import { useEffect, useRef, useState } from "react";
import { Clapperboard } from "lucide-react";
import { Button } from "../ui/Button";
import { AnalysisProgress } from "./AnalysisProgress";
import { browserDeps, exportAnalysedVideo, paintOverlay, saveRecording } from "./analysedRecording";
import type { OverlayFrame } from "./LabVideo";

/** Records the clean clip with the lab's overlay burned in, exactly as the player shows it now. */
export function AnalysedExport({ src, title, frameAt }: { src: string; title: string; frameAt: (time: number) => OverlayFrame }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const abort = useRef<AbortController | null>(null);
  const latest = useRef(frameAt);
  latest.current = frameAt;
  useEffect(() => () => abort.current?.abort(), []);
  const deps = browserDeps();
  const name = `${title.replace(/[\\/:*?"<>|]+/g, "-").trim() || "Video Lab"} - analysed`;
  const start = () => {
    if (!deps) return;
    const controller = new AbortController();
    abort.current = controller;
    setProgress(0); setMessage("");
    exportAnalysedVideo({ src, deps, signal: controller.signal, onProgress: setProgress,
      draw: (ctx, time, width, height) => paintOverlay(ctx, latest.current(time), width, height) })
      .then(({ blob, ext }) => { saveRecording(blob, `${name}.${ext}`); setMessage(`Saved ${name}.${ext} to your downloads.`); })
      .catch((e: unknown) => setMessage(e instanceof Error ? e.message : "The export stopped."))
      .finally(() => { if (abort.current === controller) abort.current = null; setProgress(null); });
  };
  return <div className="basis-full space-y-2 rounded-lg border border-line p-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" disabled={!deps || progress !== null} aria-describedby="analysed-export-help" onClick={start}><Clapperboard size={14} aria-hidden />Export analysed video</Button>
      {progress !== null && <Button onClick={() => abort.current?.abort()}>Cancel export</Button>}
    </div>
    <p id="analysed-export-help" className="text-xs text-fg-muted">{deps
      ? "The clip with the pitch outline, halfway line, team-coloured players and ball, as shown above with your current settings and labels. It records at normal playback speed in this browser; keep this tab open and visible until it finishes."
      : "This browser cannot record video. Try the latest Chrome, Edge or Safari."}</p>
    {progress !== null && <AnalysisProgress label="Recording analysed video" fraction={progress} />}
    {message && <p role="status" className="text-sm text-fg-muted">{message}</p>}
  </div>;
}
