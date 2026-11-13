import { useMutation } from "@tanstack/react-query";
import { type ClipboardEvent, type DragEvent, type FormEvent, useState } from "react";
import { ExternalLink, ImagePlus } from "lucide-react";
import { Button } from "../ui/Button";

const COLOURS = /^(?:blues?|reds?|whites?|blacks?|greens?|yellows?|ambers?|orange|purple|claret|navy|golds?)$/i;

/** The club a side belongs to, as the helper keys crests: no age group, F.C. or side code. */
export function clubOf(name: string): string {
  let words = name.replace(/\b(?:u\s*\d{1,2}s?|under[ -]?\d{1,2}|f\.?c\.?)(?=\s|$)/gi, " ").trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && (/^[A-Z]{1,3}$/.test(words[words.length - 1]) || COLOURS.test(words[words.length - 1]))) words = words.slice(0, -1);
  return words.join(" ");
}

/** Owner request 2026-11-13: an image search for the crest, in the owner's own browser
 *  (the app does not search Google itself; its terms forbid automated searches). */
export function crestSearchUrl(name: string): string {
  return `https://www.google.com/search?${new URLSearchParams({ q: `${clubOf(name)} FC crest`, udm: "2" })}`;
}

function imageFrom(items: DataTransferItemList | null | undefined, files: FileList | null | undefined): File | null {
  for (const file of Array.from(files ?? [])) if (file.type.startsWith("image/")) return file;
  for (const item of Array.from(items ?? [])) if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
  return null;
}

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
  const take = (image: File | null) => { if (image) { setFile(image); save.reset(); } };
  const onPaste = (e: ClipboardEvent) => { const image = imageFrom(e.clipboardData?.items, e.clipboardData?.files); if (image) { e.preventDefault(); take(image); } };
  const onDrop = (e: DragEvent) => { e.preventDefault(); take(imageFrom(e.dataTransfer?.items, e.dataTransfer?.files)); };
  const club = clubOf(name.trim());
  return <form onSubmit={submit} className="space-y-3" aria-label="Add a club crest">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label className="block space-y-1 text-sm"><span>Club name</span>
        <input aria-label="Club name" className="field" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="As it appears in match titles" /></label>
      <label className="block space-y-1 text-sm"><span>Crest image</span>
        <input aria-label="Crest image" type="file" accept="image/png,image/jpeg,image/webp" className="field"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
    </div>
    {club && <a href={crestSearchUrl(name)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
      <ExternalLink size={14} aria-hidden /> Find the crest on the web ({club} FC crest)</a>}
    <div role="button" tabIndex={0} aria-label="Paste or drop the crest here" onPaste={onPaste} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}
      className="flex items-center gap-2 rounded-xl border border-dashed border-line p-3 text-sm text-fg-muted focus:border-accent focus:outline-none">
      <ImagePlus size={16} aria-hidden />
      {file ? <span>{file.name} ready</span> : <span>Paste or drop the crest here: in the search, right-click the crest, Copy Image, then click here and press ⌘V.</span>}
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
