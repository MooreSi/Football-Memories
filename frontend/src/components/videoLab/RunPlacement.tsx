import { Cpu } from "lucide-react";
import { livePlacement, ranPlacement, type LiveJob } from "./placement";

/** Running now: the stage, which Mac and which compute (the mode the job was started with). */
export function LivePlacement({ job }: { job: LiveJob }) {
  const now = livePlacement(job);
  if (!now) return null;
  return <p className="flex items-start gap-2 text-sm" aria-label="Where the analysis is running">
    <Cpu size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
    <span><span className="font-medium">{now.stage}</span> · {now.where} · {now.compute}<span className="block text-xs text-fg-muted">From the mode this run started with ({job.execution === "split" ? "split across both Macs" : job.execution === "remote" ? "MacBook Pro" : "Mac mini only"}); the finished run lists what each stage actually recorded.</span></span>
  </p>;
}

/** A finished run: each stage's Mac and compute, from what the run recorded. */
export function RanPlacement({ summary }: { summary: unknown }) {
  const rows = ranPlacement(summary);
  if (!rows) return null;
  const elapsed = typeof (summary as { elapsed_s?: unknown }).elapsed_s === "number" ? Math.round((summary as { elapsed_s: number }).elapsed_s) : null;
  return <details className="panel p-3 text-sm" aria-label="Where this run ran">
    <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Cpu size={16} className="text-accent" aria-hidden />Where this run ran{elapsed !== null && <span className="text-xs font-normal text-fg-muted">· analysis {elapsed} s</span>}</summary>
    <table className="mt-2 w-full text-left text-xs"><thead className="text-fg-muted"><tr><th className="py-1 pr-2 font-normal">Stage</th><th className="py-1 pr-2 font-normal">Mac</th><th className="py-1 font-normal">Compute</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.stage} className="border-t border-line align-top"><td className="py-1 pr-2">{r.stage}</td><td className="py-1 pr-2">{r.where}{r.detail && <span className="block text-fg-muted">{r.detail}</span>}</td><td className="py-1">{r.compute}</td></tr>)}</tbody>
    </table>
    <p className="mt-2 text-xs text-fg-muted">Core ML with every compute unit lets macOS place each layer on the CPU, GPU or Neural Engine, so no single one is claimed.</p>
  </details>;
}
