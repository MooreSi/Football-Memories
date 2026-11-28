import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLabAdmin } from "../../api/labAdmin";
import { Button } from "../ui/Button";

export type CameraCompute = "cpu" | "gpu";
export type CameraNodes = {
  mode: "local" | "remote" | "split";
  camera_compute?: CameraCompute;
  camera_computes?: CameraCompute[];
  remote_camera_computes?: CameraCompute[];
};
const URL = "/_admin/api/video-nodes";
const choices: [CameraCompute, string, string][] = [
  ["cpu", "CPU", "Camera and pitch on the processor, as before."],
  ["gpu", "GPU (Metal)", "Finds the painted pitch lines on the Mac's graphics chip. Camera motion and the final solve stay on the processor. The lines found match the CPU's on all but a tiny fraction of pixels."],
];

/** App spec 850: where the camera and pitch stage runs. Mounted inside VideoNodeSettings. */
export function VideoCameraSettings({ admin, nodes, queryKey }: {
  admin: ReturnType<typeof useLabAdmin>; nodes: CameraNodes; queryKey: string[];
}) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<CameraCompute>();
  const current = nodes.camera_compute ?? "cpu";
  const local = nodes.camera_computes ?? ["cpu"];
  const remote = nodes.remote_camera_computes ?? [];
  const onMacBook = nodes.mode !== "local";
  const available = (c: CameraCompute) => c === "cpu" || (local.includes(c) && (!onMacBook || remote.includes(c)));
  const save = useMutation({ mutationFn: async (camera_compute: CameraCompute) => {
    const me = await admin.refetch();
    if (!me.data?.admin || !me.data.csrf) throw new Error("Please sign in again.");
    const r = await fetch(URL, { method: "PUT", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": me.data.csrf },
      body: JSON.stringify({ mode: nodes.mode, camera_compute }),
    });
    if (!r.ok) throw new Error(r.status === 409 ? "The GPU is not available where these jobs run." : "Camera and pitch could not be saved.");
    return r.json() as Promise<CameraNodes>;
  }, onSuccess: (data) => { client.setQueryData(queryKey, data); setDraft(undefined); } });
  const selected = draft ?? current;
  return <div className="space-y-3 border-t border-line pt-4">
    <h3 className="font-semibold">Camera and pitch</h3>
    <p className="text-sm text-fg-muted">Where new analysis jobs and pitch rebuilds find the camera and the pitch. Existing results are not changed.</p>
    <fieldset className="space-y-3" disabled={save.isPending}>
      <legend className="sr-only">Camera and pitch</legend>
      {choices.map(([compute, label, description]) => <label key={compute} className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
        <input type="radio" name="camera-compute" className="mt-1 accent-[var(--color-accent)]" aria-label={label}
          checked={selected === compute} disabled={!available(compute)}
          onChange={() => { setDraft(compute); save.reset(); }} />
        <span className="min-w-0"><span className="font-medium">{label}</span><span className="mt-1 block text-xs text-fg-muted">{description}</span></span>
      </label>)}
    </fieldset>
    {!available("gpu") && <p className="text-xs text-fg-muted">{local.includes("gpu")
      ? "The GPU is not available on the MacBook Pro. Choose Local, or use the CPU."
      : "The GPU is not available on this Mac's worker yet."}</p>}
    <Button disabled={save.isPending || selected === current || !available(selected)}
      onClick={() => save.mutate(selected)}>{save.isPending ? "Saving…" : "Save camera and pitch"}</Button>
    {save.isSuccess && <p role="status" className="text-sm">Camera and pitch saved for new jobs.</p>}
    {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
  </div>;
}
