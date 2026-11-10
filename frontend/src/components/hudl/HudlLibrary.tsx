import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, RefreshCw } from "lucide-react";
import { hudlRequest, useHudlLibrary, useHudlStatus } from "../../api/hudl";
import { Button } from "../ui/Button";

export type HudlFilters = { age: string; season: string; search: string; offlineOnly?: boolean };

/** Cached footage collection: accepts the parent All matches filters, or its own controls. */
export function HudlLibrary({ filters }: { filters?: HudlFilters }) {
  const library = useHudlLibrary();
  const status = useHudlStatus();
  const qc = useQueryClient();
  const [savedAge, setSavedAge] = useState(() => localStorage.getItem("fm.hudl.age") || "");
  const [savedSeason, setSavedSeason] = useState("");
  const [shown, setShown] = useState(12);
  const videos = library.data ?? [];
  const groups = [...new Set(videos.map(m => m.age_group))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const seasons = [...new Set(videos.map(m => m.season_label || "Unclassified"))].sort().reverse();
  const age = filters?.age ?? savedAge;
  const season = filters?.season ?? savedSeason;
  useEffect(() => setShown(12), [age, season, filters?.search]);
  const refresh = useMutation({
    mutationFn: () => hudlRequest("/account/action", { action: "refresh" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hudl-account"] }),
  });
  useEffect(() => {
    if (status.data && !status.data.busy) void qc.invalidateQueries({ queryKey: ["hudl-library"] });
  }, [status.data?.busy, qc]);
  useEffect(() => {
    if (!filters && videos.length && savedAge && !groups.includes(savedAge)) {
      setSavedAge(""); localStorage.removeItem("fm.hudl.age");
    }
  }, [library.data, filters, savedAge]);
  const matches = videos.filter(m => !filters?.offlineOnly && (!age || m.age_group === age)
    && (!season || (m.season_label || "Unclassified") === season)
    && (!filters?.search || m.title.toLowerCase().includes(filters.search.toLowerCase())));

  return <section aria-label="Hudl match library" className="space-y-4 border-t border-line pt-5">
    <div className="flex flex-wrap items-center gap-3">
      <div className="mr-auto"><h3 className="text-sm font-semibold">Connected Hudl</h3>
        <p className="mt-1 text-xs text-fg-subtle">{matches.length} of {videos.length} cached videos · Stream or download</p></div>
      {!filters && <>
        <label className="text-xs text-fg-muted">Age group<select aria-label="Hudl age group" className="field mt-1 w-auto" value={savedAge}
          onChange={e => { setSavedAge(e.target.value); localStorage.setItem("fm.hudl.age", e.target.value); }}>
          <option value="">All age groups</option>{groups.map(g => <option key={g}>{g}</option>)}
        </select></label>
        <label className="text-xs text-fg-muted">Season<select aria-label="Hudl season" className="field mt-1 w-auto" value={savedSeason} onChange={e => setSavedSeason(e.target.value)}>
          <option value="">All seasons</option>{seasons.map(s => <option key={s}>{s}</option>)}
        </select></label>
      </>}
      <Button disabled={status.data?.busy || refresh.isPending || library.isError} onClick={() => refresh.mutate()}>
        <RefreshCw size={14} /> Refresh Hudl
      </Button>
    </div>
    {library.isError && <div role="alert" className="space-y-2 rounded-xl border border-warn/20 bg-warn/5 p-3 text-sm">
      <p>Hudl connection unavailable. Start the desktop helper or check Settings → Connections. {videos.length > 0 && "Showing the last cached matches."}</p>
      <Button onClick={() => { void library.refetch(); void status.refetch(); }}>Retry connection</Button>
    </div>}
    {(refresh.isError || status.data?.state === "error") && <p role="alert" className="text-sm text-danger">{refresh.error?.message || status.data?.message}</p>}
    {status.data?.busy && <p role="status" className="text-xs text-accent">{status.data.message}</p>}
    {library.isPending ? <p className="text-sm text-fg-muted">Loading cached Hudl matches…</p> : !library.isError && matches.length === 0 &&
      <p className="text-sm text-fg-muted">{videos.length ? "No Hudl videos match these filters. Choose All age groups or All seasons to see more." : "No Hudl videos cached yet. Refresh Hudl to load your library."}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{matches.slice(0, shown).map(m => <article key={m.id} className="tile overflow-hidden transition hover:-translate-y-0.5">
      <Link to={`/hudl/${encodeURIComponent(m.id)}`} aria-label={m.title} className="block">
        <div className="relative aspect-video overflow-hidden bg-ink-800">
          {m.thumbnail_url ? <img crossOrigin="anonymous" src={m.thumbnail_url} alt={m.title} loading="lazy" className="size-full object-cover" />
            : <div className="grid h-full place-items-center text-fg-subtle"><Film size={28} /><span className="text-xs">Thumbnail pending refresh</span></div>}
          <span className="absolute left-2.5 top-2.5 rounded-full bg-ink-950/80 px-2 py-1 text-[11px] text-accent">{m.age_group} · Hudl</span>
        </div>
        <div className="space-y-2 p-4"><h3 className="text-sm font-semibold leading-snug">{m.title}</h3>
          <p className="text-xs text-fg-subtle">{m.season_label || "Unclassified season"}</p>
          <p className="text-xs text-fg-muted">Watch match · Download match or tagged moments</p></div>
      </Link>
    </article>)}</div>
    {shown < matches.length && <div className="flex justify-center"><Button onClick={() => setShown(n => n + 12)}>Show more Hudl matches ({matches.length - shown})</Button></div>}
  </section>;
}
