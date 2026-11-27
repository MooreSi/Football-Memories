import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLabAdmin } from "../../api/labAdmin";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { VideoReidSettings, type ReidNodes } from "./VideoReidSettings";

type Mode = "local" | "remote" | "split";
type Nodes = ReidNodes & { mode: Mode; local_ready: boolean; remote_ready: boolean };
const URL = "/_admin/api/video-nodes";
const KEY = ["video-nodes"];
const choices: [Mode, string, string][] = [
  ["local", "Local Mac mini", "Run all stages on this Mac."],
  ["remote", "MacBook Pro", "Transfer the selected clip and run all stages on the MacBook."],
  ["split", "Split between both Macs", "After local tracking, run pitch reconstruction on the mini and player appearance on the MacBook at the same time."],
];

/** Mounted only after AdvancedSettings verifies full admin access. Reference 01 panels. */
export function VideoNodeSettings({ admin }: { admin: ReturnType<typeof useLabAdmin> }) {
  const client = useQueryClient();
  const [draft, setDraft] = useState<Mode>();
  const nodes = useQuery<Nodes>({ queryKey: KEY, retry: false, refetchInterval: 15000,
    queryFn: async () => {
      const r = await fetch(URL, { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error("Analysis nodes could not be loaded.");
      const data = await r.json() as Nodes;
      if (!["local", "remote", "split"].includes(data.mode)) throw new Error("Analysis nodes could not be loaded.");
      return data;
    },
  });
  const save = useMutation({ mutationFn: async (mode: Mode) => {
    const me = await admin.refetch();
    if (!me.data?.admin || !me.data.csrf) throw new Error("Please sign in again.");
    const r = await fetch(URL, { method: "PUT", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": me.data.csrf },
      body: JSON.stringify({ mode }),
    });
    if (!r.ok) throw new Error(r.status === 409 ? "MacBook Pro is unavailable. Check its connection, then try again." : "Analysis location could not be saved.");
    return r.json() as Promise<Nodes>;
  }, onSuccess: (data) => { client.setQueryData(KEY, data); setDraft(undefined); } });
  const selected = draft ?? nodes.data?.mode;
  return <div className="space-y-3 border-t border-line pt-4">
    <h3 className="font-semibold">Video Lab analysis location</h3>
    <p className="text-sm text-fg-muted">Choose where your new analysis jobs run. Jobs already started keep their location. Other users continue using the local worker.</p>
    {nodes.isPending ? <Spinner label="Checking analysis nodes" /> : nodes.isError ? <p role="alert" className="text-sm text-danger">{nodes.error.message}</p> : <>
      <p className="text-xs text-fg-muted">Local worker: {nodes.data.local_ready ? "ready" : "not reporting"}. {nodes.data.remote_ready ? "MacBook Pro: ready." : "MacBook Pro is unavailable. Check it is awake and connected by Thunderbolt."}</p>
      <fieldset className="space-y-3" disabled={save.isPending}>
        <legend className="sr-only">Analysis location</legend>
        {choices.map(([mode, label, description]) => <label key={mode} className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
          <input type="radio" name="analysis-location" className="mt-1 accent-[var(--color-accent)]" aria-label={label}
            checked={selected === mode} disabled={mode !== "local" && !nodes.data.remote_ready}
            onChange={() => { setDraft(mode); save.reset(); }} />
          <span className="min-w-0"><span className="font-medium">{label}</span><span className="mt-1 block text-xs text-fg-muted">{description}</span></span>
        </label>)}
      </fieldset>
      <p className="text-xs text-fg-muted">Single-stage rebuilds use the relevant node. Split does not divide the video timeline; results keep continuous tracking. Speed depends on the clip and transfer time. An unavailable MacBook stops remote work with an error.</p>
      <Button disabled={save.isPending || selected === nodes.data.mode || !selected || (selected !== "local" && !nodes.data.remote_ready)}
        onClick={() => selected && save.mutate(selected)}>{save.isPending ? "Saving…" : "Save analysis location"}</Button>
      {save.isSuccess && <p role="status" className="text-sm">Analysis location saved for new jobs.</p>}
      <VideoReidSettings admin={admin} nodes={nodes.data} queryKey={KEY} />
    </>}
    {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
  </div>;
}
