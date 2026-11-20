import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { type VeoSharedLink, veoRequest } from "../../api/veo";
import { Button } from "../ui/Button";

const KEY = ["veo-shared"];

/** Owner request 2026-11-20: shared (public) Veo match links. Whoever shares a match on
 *  Veo can give its address; the helper reads it signed out, so no Veo account is needed. */
export function VeoSharedLinks({ disabled = false }: { disabled?: boolean }) {
  const client = useQueryClient();
  const [url, setUrl] = useState("");
  const links = useQuery<VeoSharedLink[]>({ queryKey: KEY, queryFn: () => veoRequest("/shared"), retry: false });
  const changed = () => {
    for (const key of [KEY, ["veo-account"], ["veo-library"]]) void client.invalidateQueries({ queryKey: key });
  };
  const add = useMutation({ mutationFn: () => veoRequest("/shared", { url: url.trim() }),
    onSuccess: () => { setUrl(""); changed(); } });
  const remove = useMutation({ mutationFn: (slug: string) => veoRequest("/shared/delete", { slug }), onSuccess: changed });
  const busy = disabled || add.isPending || remove.isPending;
  function submit(event: FormEvent) { event.preventDefault(); add.mutate(); }
  const saved = links.data ?? [];
  return <section aria-label="Shared Veo matches" className="space-y-3 border-t border-line pt-4">
    <div className="flex items-center gap-2 text-sm font-semibold"><Link2 size={17} /> Shared match links</div>
    <p className="text-xs text-fg-subtle">Paste the address of a match shared publicly on Veo. It is read without signing in, so no Veo email or password is needed.</p>
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input aria-label="Shared Veo match link" type="url" required disabled={busy} className="field min-w-0 flex-1"
        value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://app.veo.co/matches/…" />
      <Button type="submit" variant="primary" disabled={busy || !url.trim()}>{add.isPending ? "Adding…" : "Add link"}</Button>
    </form>
    {saved.length > 0 && <ul aria-label="Shared Veo match links" className="space-y-2">
      {saved.map((link) => {
        const name = link.title || link.url;
        return <li key={link.slug} className="tile flex items-center gap-3 p-3 text-sm">
          <span className="min-w-0 flex-1 truncate" title={link.url}>{name}</span>
          <Button type="button" aria-label={`Delete link ${name}`} disabled={busy} onClick={() => remove.mutate(link.slug)}>
            <Trash2 size={14} /> Delete</Button>
        </li>;
      })}
    </ul>}
    {(add.isError || remove.isError) && <p role="alert" className="text-sm text-danger">{(add.error ?? remove.error)?.message}</p>}
  </section>;
}
