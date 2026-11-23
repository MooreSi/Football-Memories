import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock3, Film, RefreshCw } from "lucide-react";
import { useVeoLibrary, useVeoStatus, veoAgeGroups, veoExpiry, veoRequest } from "../../api/veo";
import { connectionShown } from "../../lib/connections";
import { Button } from "../ui/Button";
import { ScoreBadge } from "../hudl/HudlLibrary";
import { fixtureDate, fixtureParts, ordinalDate } from "../../lib/hudlFixture";
import { useVeoCardClubOf } from "../../lib/useVeoClub";

import { TournamentSelect, useTournamentSelection } from "../library/Tournaments";

export type VeoFilters = { age: string; season: string; search: string };

/** Spec 260: the helper's cached Veo matches in All matches, with the shared filters. */
export function VeoLibrary({ filters }: { filters: VeoFilters }) {
  const tournament = useTournamentSelection();
  const shown = connectionShown("veo");
  const library = useVeoLibrary();
  const veoClubOf = useVeoCardClubOf();
  // Owner request 2026-11-15: Refresh Veo here, like Refresh Hudl (the same action as
  // Settings → Connections → Veo → Refresh matches).
  const status = useVeoStatus();
  const qc = useQueryClient();
  const refresh = useMutation({
    mutationFn: () => veoRequest("/action", { action: "refresh" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["veo-account"] }),
  });
  useEffect(() => {
    if (status.data && !status.data.busy) void qc.invalidateQueries({ queryKey: ["veo-library"] });
  }, [status.data?.busy, qc]);
  const [count, setCount] = useState(12);
  useEffect(() => setCount(12), [filters.age, filters.season, filters.search, tournament?.tournamentId, tournament?.team]);
  if (!shown) return null;
  const all = library.data ?? [];
  const matches = all.filter(m => (tournament?.includes(`veo:${m.id}`) ?? true) && (!filters.age || veoAgeGroups(m).includes(filters.age))
    && (!filters.season || (m.season_label || "Unclassified") === filters.season)
    && (!filters.search || m.title.toLowerCase().includes(filters.search.toLowerCase())));
  return <section aria-label="Veo match library" className="space-y-4 border-t border-line pt-5">
    <div className="flex flex-wrap items-center gap-3">
      <div className="mr-auto"><h3 className="text-sm font-semibold">Connected Veo</h3>
        <p className="mt-1 text-xs text-fg-subtle">{matches.length} of {all.length} cached Veo matches · Details and highlights</p></div>
      <Button disabled={!(status.data?.configured || status.data?.shared) || status.data.busy || refresh.isPending || library.isError}
        title={status.data && !status.data.configured && !status.data.shared ? "Save your Veo account or a shared match link in Settings → Connections first" : undefined}
        onClick={() => refresh.mutate()}><RefreshCw size={14} /> Refresh Veo</Button>
    </div>
    {(refresh.isError || status.data?.state === "error") && <p role="alert" className="text-sm text-danger">{refresh.error?.message || status.data?.message}</p>}
    {status.data?.busy && <p role="status" className="text-xs text-accent">{status.data.message}</p>}
    {library.isError && <div role="alert" className="space-y-2 rounded-xl border border-warn/20 bg-warn/5 p-3 text-sm">
      <p>Veo matches unavailable. Start the desktop helper or check Settings → Connections.</p>
      <Button onClick={() => void library.refetch()}>Retry connection</Button>
    </div>}
    {library.isPending ? <p className="text-sm text-fg-muted">Loading cached Veo matches…</p> : !library.isError && matches.length === 0 &&
      <p className="text-sm text-fg-muted">{all.length ? "No Veo matches match these filters." : "No Veo matches cached yet. Select Refresh Veo, or Refresh matches in Settings → Connections → Veo."}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{matches.slice(0, count).map(m => {
      const expiry = veoExpiry(m);
      const highlights = m.moments?.length ?? 0;
      const date = fixtureDate(m.title);
      // Owner request 2026-11-15: the account films more than one club; name the one the title names.
      const club = veoClubOf(m);
      return <article key={m.id} className="tile overflow-hidden transition hover:-translate-y-0.5">
        <Link to={`/veo/${encodeURIComponent(m.id)}`} aria-label={m.title} className="block">
          <div className="relative grid aspect-video place-items-center overflow-hidden bg-ink-800 text-fg-subtle">
            {m.poster_url ? <img crossOrigin="anonymous" src={m.poster_url} alt={m.title} loading="lazy" className="absolute inset-0 size-full object-cover" />
              : <span className="grid place-items-center gap-1"><Film size={28} aria-hidden /></span>}
            {/* Owner request 2026-11-15: the crest and score pill, as on a Hudl card. */}
            {m.score && (club && fixtureParts(m.title, club) ? <ScoreBadge title={m.title} club={club} score={m.score} />
              : <span className="absolute right-2.5 bottom-2.5 rounded-lg bg-ink-950/85 px-2.5 py-1 text-lg font-semibold tabular-nums text-fg">{m.score.ours}–{m.score.theirs}</span>)}
            <span className="absolute left-2.5 top-2.5 rounded-full bg-ink-950/80 px-2 py-1 text-[11px] text-accent">{veoAgeGroups(m).join(" / ")} · Veo</span>
            {expiry && <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full bg-ink-950/80 px-2 py-1 text-[11px] text-warn"><Clock3 size={12} aria-hidden />{expiry}</span>}
          </div>
          <div className="space-y-2 p-4"><h3 className="text-sm font-semibold leading-snug">{m.title}</h3>
            <p className="text-xs text-fg-subtle">{m.season_label || "Unclassified season"}</p>
            <p className="text-xs text-fg-muted">{date ? ordinalDate(date) : "Undated"} · {highlights} {highlights === 1 ? "highlight" : "highlights"}</p></div>
        </Link>
        <TournamentSelect matchKey={`veo:${m.id}`} title={m.title} />
      </article>;
    })}</div>
    {count < matches.length && <div className="flex justify-center"><Button onClick={() => setCount(n => n + 12)}>Show more Veo matches ({matches.length - count})</Button></div>}
  </section>;
}
