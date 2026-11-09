import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { DEFAULT_BUFFERS } from "../../lib/events";
import { formatClock } from "../../lib/format";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";

const EXAMPLE_AT = 932; // 15:32, the brief's own example

function Slider({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <span className="font-mono text-lg text-accent tabular-nums">{value}s</span>
      </div>
      <input id={id} type="range" min={0} max={30} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#22d3ee]" />
      <p className="text-xs text-fg-subtle">{hint}</p>
    </div>
  );
}

/** Brief section 9: configurable pre-event and post-event buffer. */
export function PlaybackSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [pre, setPre] = useState(DEFAULT_BUFFERS.pre);
  const [post, setPost] = useState(DEFAULT_BUFFERS.post);
  useEffect(() => {
    if (q.data) {
      setPre(q.data.clip_pre_s);
      setPost(q.data.clip_post_s);
    }
  }, [q.data]);
  const save = useMutation({
    mutationFn: () => api.updateSettings({ clip_pre_s: pre, clip_post_s: post }),
    onSuccess: (data) => qc.setQueryData(["settings"], data),
  });

  if (q.isPending) return <Spinner />;
  const changed = q.data && (q.data.clip_pre_s !== pre || q.data.clip_post_s !== post);
  const start = Math.max(0, EXAMPLE_AT - pre);
  const end = EXAMPLE_AT + post;

  return (
    <section aria-label="Clip timing" className="panel max-w-3xl space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Clip timing</h2>
        <p className="text-sm text-fg-muted">How much of the match to show around each tagged moment, everywhere moments play.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Slider id="pre" label="Before the tag" hint="See the build-up." value={pre} onChange={setPre} />
        <Slider id="post" label="After the tag" hint="See what happened next." value={post} onChange={setPost} />
      </div>

      <div className="tile p-4" aria-live="polite">
        <p className="text-xs text-fg-subtle uppercase">Example</p>
        <p className="mt-1 text-sm">
          A save tagged at <span className="font-mono text-pin">{formatClock(EXAMPLE_AT)}</span> plays from{" "}
          <span className="font-mono text-accent">{formatClock(start)}</span> to{" "}
          <span className="font-mono text-accent">{formatClock(end)}</span> ({end - start} seconds).
        </p>
        <div className="relative mt-3 h-2 rounded-full bg-white/10">
          <div className="absolute inset-y-0 rounded-full bg-accent/40" style={{ left: `${(start / (EXAMPLE_AT + 40)) * 100}%`, width: `${((end - start) / (EXAMPLE_AT + 40)) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-fg-subtle">Moments near the start or end of a match are trimmed to the video.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!changed || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving" : "Save"}
        </Button>
        <Button variant="ghost" onClick={() => { setPre(DEFAULT_BUFFERS.pre); setPost(DEFAULT_BUFFERS.post); }}>
          <RotateCcw size={14} aria-hidden /> Defaults ({DEFAULT_BUFFERS.pre}s / {DEFAULT_BUFFERS.post}s)
        </Button>
        {save.isSuccess && !changed && <span className="inline-flex items-center gap-1 text-sm text-ok"><Check size={15} aria-hidden /> Saved</span>}
        {save.isError && <span role="alert" className="text-sm text-danger">{(save.error as Error).message}</span>}
      </div>
    </section>
  );
}
