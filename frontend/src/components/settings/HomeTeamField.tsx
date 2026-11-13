import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../api/client";
import { useHomeTeams } from "../../lib/useHomeTeams";
import { Button } from "../ui/Button";

const NAMES = { hudl: "Hudl", veo: "Veo" } as const;

/** Owner request 2026-11-13: the owner's team as this source should show it, e.g. a
 *  grassroots club on Veo and an academy on Hudl. Used for match names and downloads. */
export function HomeTeamField({ source }: { source: "hudl" | "veo" }) {
  const saved = useHomeTeams()?.[source] ?? "";
  const [name, setName] = useState(saved);
  useEffect(() => setName(saved), [saved]);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => api.saveHomeTeams({ [source]: name.trim() }),
    onSuccess: (data) => { qc.setQueryData(["home-teams"], data); void qc.invalidateQueries({ queryKey: ["home-club"] }); },
  });
  function submit(event: FormEvent) { event.preventDefault(); save.mutate(); }
  return <form onSubmit={submit} className="space-y-1">
    <label className="block space-y-1 text-sm"><span>Your team on {NAMES[source]}</span>
      <input aria-label={`Your team on ${NAMES[source]}`} className="field" maxLength={100} value={name}
        onChange={(e) => setName(e.target.value)} placeholder="Club name, e.g. as on the team sheet" /></label>
    <div className="flex items-center gap-2">
      <Button type="submit" disabled={save.isPending || name.trim() === saved}>Save team name</Button>
      {save.isSuccess && name.trim() === saved && <span role="status" className="text-xs text-ok">Saved</span>}
      {save.isError && <span role="alert" className="text-xs text-danger">{(save.error as Error).message}</span>}
    </div>
    <p className="text-xs text-fg-subtle">Used for {NAMES[source]} match names and downloaded file names.</p>
  </form>;
}
