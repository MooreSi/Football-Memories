import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLabAdmin } from "../../api/labAdmin";
import { Button } from "../ui/Button";

export type ReidBackend = "pytorch" | "neural-engine";
export type ReidNodes = {
  mode: "local" | "remote" | "split";
  reid_backend?: ReidBackend;
  reid_backends?: ReidBackend[];
  remote_reid_backends?: ReidBackend[];
};
const URL = "/_admin/api/video-nodes";
const choices: [ReidBackend, string, string][] = [
  ["pytorch", "Standard model", "Player matching on the GPU, as before. Results match earlier runs."],
  ["neural-engine", "Neural Engine", "About twice as fast for the player appearance stage. Its lower-precision maths can group a few players differently from the standard model; neither has been checked as more accurate."],
];

/** Mounted inside VideoNodeSettings after full admin access is verified. Reference 01 panels. */
export function VideoReidSettings({ admin, nodes, queryKey }: {
  admin: ReturnType<typeof useLabAdmin>; nodes: ReidNodes; queryKey: string[];
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<ReidBackend>();
  const current = nodes.reid_backend ?? "pytorch";
  const local = nodes.reid_backends ?? ["pytorch"];
  const remote = nodes.remote_reid_backends ?? [];
  const onMacBook = nodes.mode !== "local";
  const available = (b: ReidBackend) => b === "pytorch" || (local.includes(b) && (!onMacBook || remote.includes(b)));
  const save = useMutation({ mutationFn: async (reid_backend: ReidBackend) => {
    const me = await admin.refetch();
    if (!me.data?.admin || !me.data.csrf) throw new Error("Please sign in again.");
    const r = await fetch(URL, { method: "PUT", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": me.data.csrf },
      body: JSON.stringify({ mode: nodes.mode, reid_backend }),
    });
    if (!r.ok) throw new Error(r.status === 409 ? "The Neural Engine model is not installed where these jobs run." : "Player matching could not be saved.");
    return r.json() as Promise<ReidNodes>;
  }, onSuccess: (data) => { client.setQueryData(queryKey, data); setDraft(undefined); } });
  const selected = draft ?? current;
  const neuralMissing = !available("neural-engine");
  return <div className="space-y-3 border-t border-line pt-4">
    <h3 className="font-semibold">Player matching model</h3>
    <p className="text-sm text-fg-muted">Used to group players by appearance in new analysis jobs. Existing results are not changed.</p>
    <fieldset className="space-y-3" disabled={save.isPending}>
      <legend className="sr-only">Player matching model</legend>
      {choices.map(([backend, label, description]) => <label key={backend} className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
        <input type="radio" name="player-matching" className="mt-1 accent-[var(--color-accent)]" aria-label={label}
          checked={selected === backend} disabled={!available(backend)}
          onChange={() => { setDraft(backend); save.reset(); }} />
        <span className="min-w-0"><span className="font-medium">{label}</span><span className="mt-1 block text-xs text-fg-muted">{description}</span></span>
      </label>)}
    </fieldset>
    {neuralMissing && <p className="text-xs text-fg-muted">{local.includes("neural-engine")
      ? "The Neural Engine model is not installed on the MacBook Pro. Choose Local, or use the standard model."
      : "The Neural Engine model is not installed on this Mac."}</p>}
    <Button disabled={save.isPending || selected === current || !available(selected)}
      onClick={() => save.mutate(selected)}>{save.isPending ? "Saving…" : "Save player matching"}</Button>
    {save.isSuccess && <p role="status" className="text-sm">Player matching saved for new jobs.</p>}
    {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
  </div>;
}
