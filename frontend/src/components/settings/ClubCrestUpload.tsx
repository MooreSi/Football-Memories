import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Button } from "../ui/Button";

/** Owner request 2026-11-13: most Veo opponents are grassroots clubs Wikipedia does not
 *  have, so the owner can give any club its crest. Every side of the club shares it
 *  ("Northgate CB" and "Northgate Reds" use the Northgate crest). */
export function ClubCrestUpload({ initialName = "" }: { initialName?: string }) {
  const [name, setName] = useState(initialName);
  const [file, setFile] = useState<File | null>(null);
  const [stamp, setStamp] = useState(0);
  const save = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      body.set("name", name.trim());
      body.set("file", file!);
      const answer = await fetch("/api/team-logo", { method: "POST", body });
      const data = await answer.json().catch(() => ({}));
      if (!answer.ok) throw new Error(data.detail || "The crest could not be saved.");
      return name.trim();
    },
    onSuccess: () => setStamp(Date.now()),
  });
  function submit(event: FormEvent) { event.preventDefault(); save.mutate(); }
  return <form onSubmit={submit} className="space-y-3" aria-label="Add a club crest">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="block space-y-1 text-sm"><span>Club name</span>
        <input aria-label="Club name" className="field" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears in match titles" /></label>
      <label className="block space-y-1 text-sm"><span>Crest image</span>
        <input aria-label="Crest image" type="file" accept="image/png,image/jpeg,image/webp" className="field"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
    </div>
    <div className="flex items-center gap-3">
      <Button type="submit" disabled={!name.trim() || !file || save.isPending}>Save crest</Button>
      {save.isSuccess && <span role="status" className="flex items-center gap-2 text-xs text-ok">
        <img src={`/api/team-logo?name=${encodeURIComponent(save.data)}&v=${stamp}`} alt="" className="size-6 rounded-full bg-white object-contain p-0.5" />
        Crest saved for {save.data}</span>}
      {save.isError && <span role="alert" className="text-xs text-danger">{(save.error as Error).message}</span>}
    </div>
    <p className="text-xs text-fg-subtle">PNG, JPEG or WebP under 2 MB, kept on this computer. A club's sides share one crest.</p>
  </form>;
}
