import { Folder, Plus, Sparkles, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Facets, MomentFilters, PlaylistSummary } from "../../api/types";
import { formatClock } from "../../lib/format";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Reference 02's left rail: event types with counts and a solid active row, then PLAYLISTS with "+". */
export function ClipFiltersRail({ facets, filters, onChange, playlists, activePlaylistId, onOpenPlaylist, onDeletePlaylist, onSaveQueue, canSave }: {
  facets: Facets | undefined;
  filters: MomentFilters;
  onChange: (f: MomentFilters) => void;
  playlists: PlaylistSummary[];
  activePlaylistId: number | null;
  onOpenPlaylist: (id: number) => void;
  onDeletePlaylist: (id: number) => void;
  onSaveQueue: (name: string) => void;
  canSave: boolean;
}) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const set = (patch: Partial<MomentFilters>) => onChange({ ...filters, ...patch });
  const row = (active: boolean) =>
    `flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium tracking-wide uppercase transition ${
      active ? "bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white" : "text-fg-muted hover:bg-white/5 hover:text-fg"
    }`;
  const total = facets?.categories.reduce((a, c) => a + c.count, 0) ?? 0;

  return (
    <aside className="panel flex min-h-0 flex-col overflow-hidden !rounded-2xl xl:sticky xl:top-[84px] xl:max-h-[calc(100vh-100px)]" aria-label="Clip filters">
      <h2 className="border-b border-white/5 px-4 py-3 text-sm font-semibold tracking-[0.15em] uppercase">Clip explorer</h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label="Event types">
          <li>
            <button type="button" aria-pressed={filters.categories.length === 0} onClick={() => set({ categories: [] })} className={row(filters.categories.length === 0)}>
              <Sparkles size={15} aria-hidden /> <span className="flex-1">All moments</span> <span className="tabular-nums">{total}</span>
            </button>
          </li>
          {facets?.categories.map((c) => {
            const active = filters.categories.includes(c.name);
            return (
              <li key={c.name}>
                <button type="button" aria-pressed={active} onClick={() => set({ categories: toggle(filters.categories, c.name) })} className={row(active)}>
                  <Tag size={15} aria-hidden className={active ? "" : "text-pin"} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="tabular-nums">{c.count}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="space-y-4 border-t border-white/5 p-4">
          {facets && facets.players.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.15em] text-fg-subtle uppercase">Players</p>
                <div role="radiogroup" aria-label="Player logic" className="inline-flex rounded-md border border-line p-0.5 text-[11px]">
                  {(["any", "all"] as const).map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={filters.playerMode === m} onClick={() => set({ playerMode: m })}
                      className={`rounded px-2 py-0.5 ${filters.playerMode === m ? "bg-ink-700 text-fg" : "text-fg-muted"}`}>
                      {m === "any" ? "Any" : "All"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {facets.players.map((p) => {
                  const active = filters.playerIds.includes(p.id!);
                  return (
                    <button key={p.id} type="button" aria-pressed={active} onClick={() => set({ playerIds: toggle(filters.playerIds, p.id!) })}
                      className={`rounded-full border px-2.5 py-1 text-xs ${active ? "border-accent/60 bg-accent/15 text-accent" : "border-line bg-ink-800 text-fg-muted hover:text-fg"}`}>
                      {p.name} {p.count}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 text-xs text-fg-muted">
              Team
              <select className="field mt-1" value={filters.teamId ?? ""} onChange={(e) => set({ teamId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">All teams</option>
                {facets?.teams.map((t) => <option key={t.id} value={t.id!}>{t.name}</option>)}
              </select>
            </label>
            <label className="col-span-2 text-xs text-fg-muted">
              Season
              <select className="field mt-1" value={filters.seasonId ?? ""} onChange={(e) => set({ seasonId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">All seasons</option>
                {facets?.seasons.map((s) => <option key={s.id} value={s.id!}>{s.name}</option>)}
              </select>
            </label>
            <label className="text-xs text-fg-muted">
              From
              <input type="date" className="field mt-1 px-2" value={filters.dateFrom ?? ""} onChange={(e) => set({ dateFrom: e.target.value || undefined })} />
            </label>
            <label className="text-xs text-fg-muted">
              To
              <input type="date" className="field mt-1 px-2" value={filters.dateTo ?? ""} onChange={(e) => set({ dateTo: e.target.value || undefined })} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {([["favourites", "Favourites"], ["unwatched", "Unwatched"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={filters[k]} onClick={() => set({ [k]: !filters[k] })}
                className={`rounded-full border px-3 py-1 ${filters[k] ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-fg-muted hover:text-fg"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PLAYLISTS (reference 02 bottom-left) */}
      <section aria-label="Playlists" className="border-t border-white/10 bg-ink-950/40">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">Playlists</h2>
          <button type="button" aria-label="Save the queue as a playlist" disabled={!canSave} onClick={() => setNaming(true)}
            className="grid size-8 place-items-center rounded-full border border-line hover:border-accent/50 disabled:opacity-30" title={canSave ? "Save the queue as a playlist" : "Add moments to the queue first"}>
            <Plus size={16} />
          </button>
        </div>
        {naming && (
          <form className="flex gap-2 px-4 pb-3" onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              onSaveQueue(name.trim());
              setName("");
              setNaming(false);
            }
          }}>
            <input autoFocus className="field py-1.5" placeholder="Playlist name" aria-label="Playlist name" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="rounded-lg bg-[#2563eb] px-3 text-xs font-semibold text-white">Save</button>
          </form>
        )}
        <ul className="max-h-48 overflow-y-auto pb-2">
          {playlists.length === 0 && <li className="flex items-center gap-2 px-4 py-2 text-xs text-fg-subtle"><Folder size={14} aria-hidden /> No playlists yet</li>}
          {playlists.map((p) => (
            <li key={p.id} className={`group flex items-center ${activePlaylistId === p.id ? "bg-accent/10" : ""}`}>
              <button type="button" onClick={() => onOpenPlaylist(p.id)} className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2 text-left text-sm hover:text-accent">
                <Folder size={14} className="shrink-0 text-pin" aria-hidden />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-fg-subtle">{p.item_count} · {formatClock(p.total_seconds)}</span>
              </button>
              <button type="button" aria-label={`Delete playlist ${p.name}`} onClick={() => onDeletePlaylist(p.id)} className="px-3 text-fg-subtle opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
