import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../ui/Button";
import { BallLabeller } from "./BallLabeller";
import { getJson, MIN_EACH, send, sides, type BallLabels, type BallSet, type BallSetSummary, type Training, type TrainingRequest } from "./trainingApi";

type Run = { id: string; match_title?: string; state: string; parent_job_id?: string };
const pct = (v: number | null) => v === null ? "-" : `${Math.round(v * 100)}%`;
const STATE: Record<TrainingRequest["state"], string> = { queued: "Waiting for the worker", running: "Running", complete: "Done", failed: "Failed" };

/** Spec 790: label what the detector calls a ball, then train the ball model on those labels. */
export function TrainingTab() {
  const cache = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [run, setRun] = useState("");
  const training = useQuery({ queryKey: ["ball-training"], queryFn: () => getJson<Training>("/training"),
    refetchInterval: q => q.state.data?.requests.some(r => r.state === "queued" || r.state === "running") ? 3000 : false });
  const sets = useQuery({ queryKey: ["ball-sets", training.data?.requests.filter(r => r.state === "complete").length ?? 0], queryFn: () => getJson<BallSetSummary[]>("/ball-sets") });
  const runs = useQuery({ queryKey: ["video-lab-jobs"], queryFn: () => getJson<Run[]>("/jobs") });
  const labels = useQueries({ queries: (sets.data ?? []).map(s => ({ queryKey: ["ball-labels", s.id], queryFn: () => getJson<BallLabels>(`/ball-sets/${s.id}/labels`) })) });
  const chosen = useQuery({ queryKey: ["ball-set", open], queryFn: () => getJson<BallSet>(`/ball-sets/${open}`), enabled: !!open });
  const finished = (runs.data ?? []).filter(r => r.state === "complete");
  const picked = run || finished[0]?.id || "";
  const titled = (r: Run) => r.match_title ?? finished.find(p => p.id === r.parent_job_id)?.match_title ?? `Run ${r.id.slice(0, 8)}`;
  const counts = useMemo(() => sides(labels.flatMap(l => l.data ? [l.data] : [])), [labels]);
  const enough = counts.balls >= MIN_EACH && counts.other >= MIN_EACH;
  const busyTrain = training.data?.requests.some(r => r.kind === "ball-train" && (r.state === "queued" || r.state === "running"));
  const refresh = () => { void cache.invalidateQueries({ queryKey: ["ball-training"] }); void cache.invalidateQueries({ queryKey: ["ball-sets"] }); };
  const makeCrops = useMutation({ mutationFn: () => send("POST", "/training/ball-sets", { job_id: picked }, "Crops could not be asked for."), onSuccess: refresh });
  const train = useMutation({ mutationFn: () => send("POST", "/training/ball-model", {}, "Training could not be started."), onSuccess: refresh });
  const openLabels = labels.find((_, i) => sets.data?.[i]?.id === open)?.data;
  const error = training.error || sets.error || makeCrops.error || train.error;

  if (open && chosen.data && openLabels)
    return <BallLabeller set={chosen.data} labels={openLabels} onClose={() => { setOpen(null); refresh(); }}
      onSaved={l => { cache.setQueryData(["ball-labels", open], l); }} />;

  return <div className="space-y-4">
    {error && <p role="alert" className="panel p-4 text-warn">{error.message}</p>}
    <section className="panel space-y-3 p-4" aria-label="Ball model">
      <h2 className="font-semibold">Ball model</h2>
      <p className="text-sm text-fg-muted">The detector calls cones, spare balls and heads "ball" as often as the match ball. Label crops below; the model learns the match ball from your labels only. A trained model is not used for analysis until it is checked against Hudl and Veo tags.</p>
      <p className="text-sm"><strong>{counts.balls} match ball{counts.balls === 1 ? "" : "s"} and {counts.other} other thing{counts.other === 1 ? "" : "s"} labelled</strong>{!enough && <span className="text-fg-muted"> · training needs at least {MIN_EACH} of each</span>}</p>
      <Button disabled={!enough || !!busyTrain || train.isPending} onClick={() => train.mutate()}>Train ball model</Button>
      {!!training.data?.requests.filter(r => r.kind === "ball-train").length && <ul className="space-y-1 text-sm">{training.data.requests.filter(r => r.kind === "ball-train").slice(0, 3).map(r =>
        <li key={r.id}>Training · {STATE[r.state]}{r.error ? `: ${r.error}` : ""}</li>)}</ul>}
      {!!training.data?.models.length && <table className="w-full text-sm" aria-label="Trained ball models">
        <thead className="text-left text-xs text-fg-muted"><tr><th className="py-1 font-normal">Trained</th><th className="font-normal">Labels</th><th className="font-normal">Held-out match</th><th className="font-normal">Precision</th><th className="font-normal">Recall</th></tr></thead>
        <tbody>{training.data.models.map(m => { const e = m.metrics.evaluation; const n = Object.values(m.metrics.counts).reduce((a, b) => a + b, 0);
          return <tr key={m.id} className="border-t border-line align-top"><td className="py-1.5">{m.metrics.created_at ? new Date(m.metrics.created_at).toLocaleString() : m.id.slice(0, 8)}</td><td className="tabular-nums">{n}</td>
            <td>{e.held_out_match ?? <span className="text-fg-muted">{e.note}</span>}</td><td className="tabular-nums">{pct(e.precision)}</td><td className="tabular-nums">{pct(e.recall)}</td></tr>; })}</tbody>
      </table>}
    </section>
    <section className="panel space-y-3 p-4" aria-label="Add crops">
      <h2 className="font-semibold">Ball crops</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Finished run<select className="mt-1 block w-72 rounded-lg border border-line bg-ink-900 p-1.5" value={picked} onChange={e => setRun(e.target.value)}>
          {finished.map(r => <option key={r.id} value={r.id}>{titled(r)}</option>)}</select></label>
        <Button disabled={!picked || makeCrops.isPending} onClick={() => makeCrops.mutate()}>Make crops</Button>
      </div>
      <p className="text-xs text-fg-muted">Cuts up to 300 of the detector's ball boxes from the run, spread over the clip. Originals are not changed.</p>
      {!!training.data?.requests.filter(r => r.kind === "ball-set" && r.state !== "complete").length && <ul className="space-y-1 text-sm">{training.data.requests.filter(r => r.kind === "ball-set" && r.state !== "complete").map(r =>
        <li key={r.id}>{r.match_title ?? "Run"} · {STATE[r.state]}{r.error ? `: ${r.error}` : ""}</li>)}</ul>}
      {sets.data?.length ? <ul className="space-y-1" aria-label="Ball sets">{sets.data.map((s, i) => { const done = Object.keys(labels[i]?.data?.items ?? {}).length || s.labelled;
        return <li key={s.id}><button className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-left text-sm hover:border-accent" onClick={() => setOpen(s.id)}>
          <span>{s.match_title ?? "Ball crops"}</span><span className="tabular-nums text-fg-muted">{done} of {s.crops} labelled</span></button></li>; })}</ul>
        : <p className="text-sm text-fg-muted">No crops yet: make some from a finished run.</p>}
    </section>
  </div>;
}
