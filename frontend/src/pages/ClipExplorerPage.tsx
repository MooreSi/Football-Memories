import { useArchiveFilters } from "../lib/archiveFilters";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, ListVideo, Save, Search, Shuffle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { MomentFilters, MomentItem } from "../api/types";
import { ClipCard } from "../components/clips/ClipCard";
import { ClipFiltersRail } from "../components/clips/ClipFiltersRail";
import { QueueList } from "../components/clips/QueueList";
import { QueuePlayer } from "../components/clips/QueuePlayer";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { moveItem, removeAt } from "../lib/queue";
import { hudlAgeGroups, useHudlLibrary } from "../api/hudl";
import { latestFirst } from "../lib/hudlFixture";
import { HudlMatchView } from "./HudlMatchPage";

const PAGE = 60;
const START: MomentFilters = { categories: [], playerIds: [], playerMode: "any", favourites: false, unwatched: false, sort: "newest" };

/** Clips: pick one Hudl match (newest for the selected age group by default) or
 *  search moments across imported matches. */
export function ClipExplorerPage() {
  const library = useHudlLibrary();
  const [chosen, setChosen] = useState<string | null>(null);
  const {age,season}=useArchiveFilters();
  const all = latestFirst(library.data ?? []);
  const forAge = all.filter((m) => (!age || hudlAgeGroups(m).includes(age)) && (!season || m.season_label===season));
  const fallback = forAge[0]?.id ?? "imported";
  const selected = chosen && (chosen === "imported" || all.some((m) => m.id === chosen)) ? chosen : fallback;
  if (!all.length) return <ImportedClips />;
  return (
    <ImportedClips compact={selected!=="imported"}>
      <label className="panel flex flex-wrap items-center gap-3 p-4 text-sm text-fg-muted">
        Match
        <select aria-label="Match" className="field w-auto max-w-full rounded-full" value={selected} onChange={(e) => setChosen(e.target.value)}>
          <optgroup label={age ? `Hudl · ${age} (newest first)` : "Hudl (newest first)"}>
            {forAge.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </optgroup>
          {age && forAge.length < all.length && (
            <optgroup label="Hudl · other age groups">
              {all.filter((m) => !forAge.includes(m)).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </optgroup>
          )}
          <option value="imported">No Hudl match (imported clips only)</option>
        </select>
      </label>
      {selected !== "imported" && (
        <section aria-label="Selected Hudl match" className="min-w-0">
          <HudlMatchView key={selected} id={selected} embedded />
        </section>
      )}
    </ImportedClips>
  );
}

/** Brief section 10. Layout follows reference 02: filter rail + playlists left, player + clip bar centre. */
function ImportedClips({children,compact=false}:{children?:ReactNode;compact?:boolean}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<MomentFilters>(START);
  const [text, setText] = useState("");
  const [queue, setQueue] = useState<MomentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [playlistId, setPlaylistId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, q: text.trim() || undefined })), 250);
    return () => clearTimeout(t);
  }, [text]);

  const facets = useQuery({ queryKey: ["moments", "facets"], queryFn: api.facets });
  const playlists = useQuery({ queryKey: ["playlists"], queryFn: api.playlists });
  const results = useInfiniteQuery({
    queryKey: ["moments", filters],
    queryFn: ({ pageParam }) => api.moments(filters, PAGE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
  const items = useMemo(() => results.data?.pages.flatMap((p) => p.items) ?? [], [results.data]);
  const total = results.data?.pages[0]?.total ?? 0;
  const queued = useMemo(() => new Set(queue.map((m) => m.event_id)), [queue]);

  const start = (list: MomentItem[], at = 0) => {
    setQueue(list);
    setIndex(at);
    setPlayToken((n) => n + 1);
  };
  const editQueue = (list: MomentItem[], i = index) => {
    setQueue(list);
    setIndex(i);
    setDirty(true);
  };

  const favourite = useMutation({
    mutationFn: ({ id, fav }: { id: number; fav: boolean }) => api.setFavourite(id, fav),
    onSuccess: (_r, v) => {
      setQueue((q) => q.map((m) => (m.event_id === v.id ? { ...m, favourite: v.fav } : m)));
      void qc.invalidateQueries({ queryKey: ["moments"] });
      void qc.invalidateQueries({ queryKey: ["player"] });
    },
  });
  const savePlaylist = useMutation({
    mutationFn: (name: string) => api.createPlaylist(name, queue.map((m) => m.event_id)),
    onSuccess: (pl) => {
      setPlaylistId(pl.id);
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
  const updatePlaylist = useMutation({
    mutationFn: () => api.updatePlaylist(playlistId!, { event_ids: queue.map((m) => m.event_id) }),
    onSuccess: () => {
      setDirty(false);
      void qc.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
  const openPlaylist = async (id: number) => {
    const pl = await api.playlist(id);
    setPlaylistId(id);
    setDirty(false);
    start(pl.items);
  };
  const deletePlaylist = async (id: number) => {
    const name = playlists.data?.find((p) => p.id === id)?.name ?? "this playlist";
    if (!window.confirm(`Delete the playlist "${name}"? The moments and videos are not affected.`)) return;
    await api.deletePlaylist(id);
    if (playlistId === id) setPlaylistId(null);
    void qc.invalidateQueries({ queryKey: ["playlists"] });
  };
  const activeName = playlists.data?.find((p) => p.id === playlistId)?.name;
  const makeReel = useMutation({
    mutationFn: () => api.createReel({
      name: activeName ?? `Highlights ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`,
      opening_title: activeName ?? "Highlights",
      items: queue.map((m) => ({ event_id: m.event_id, pre_s: null, post_s: null })),
    }),
    onSuccess: (r) => navigate(`/clips/reels/${r.id}`),
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="screen-eyebrow mb-2">MATCH ANALYSIS</p><h1 className="text-3xl font-semibold tracking-tight">Clip Explorer</h1><p className="mt-2 text-sm text-fg-muted">Watch, collect and share your best moments.</p></div><Link to="/clips/reels" className="dashboard-import">Highlight reels</Link></header>
      {children}
      <details open={!compact} className="panel min-w-0 p-4 sm:p-5"><summary className="cursor-pointer text-sm font-semibold">Saved clips &amp; playlists</summary><p className="mb-5 mt-2 text-xs text-fg-muted">Search offline moments, build a queue or create a highlight reel.</p>
      <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)]">
      <div className="order-2 min-w-0 xl:order-1">
        <ClipFiltersRail
          facets={facets.data}
          filters={filters}
          onChange={setFilters}
          playlists={playlists.data ?? []}
          activePlaylistId={playlistId}
          onOpenPlaylist={(id) => void openPlaylist(id)}
          onDeletePlaylist={(id) => void deletePlaylist(id)}
          onSaveQueue={(name) => savePlaylist.mutate(name)}
          canSave={queue.length > 0}
        />
      </div>

      <div className="order-1 min-w-0 space-y-5 xl:order-2">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Search notes and opponents</span>
              <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input className="field w-56 rounded-full pl-9" placeholder="Notes or opponent" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <label>
              <span className="sr-only">Order</span>
              <select className="field w-auto rounded-full" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value as MomentFilters["sort"] })}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <Button variant="primary" disabled={items.length === 0} onClick={() => { setPlaylistId(null); setDirty(false); start(items); }}>
              <ListVideo size={16} aria-hidden /> Play all {total > 0 ? total : ""}
            </Button>
            <Button disabled={items.length < 2} onClick={() => { setPlaylistId(null); start([...items].sort(() => Math.random() - 0.5)); }}>
              <Shuffle size={15} aria-hidden /> Shuffle
            </Button>
          </div>
        </header>

        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <QueuePlayer queue={queue} index={index} onIndex={setIndex} playToken={playToken} />
          <section aria-label="Queue" className="panel flex max-h-[560px] min-h-0 flex-col !rounded-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
              <div className="min-w-0">
                <h2 className="font-semibold">Queue</h2>
                <p className="truncate text-xs text-fg-subtle">{activeName ? `Playlist: ${activeName}${dirty ? " (changed)" : ""}` : `${queue.length} moments`}</p>
              </div>
              <Button onClick={() => makeReel.mutate()} disabled={queue.length === 0 || makeReel.isPending}>
                <Clapperboard size={14} aria-hidden /> Make highlight reel
              </Button>
              {playlistId && dirty && (
                <Button onClick={() => updatePlaylist.mutate()} disabled={updatePlaylist.isPending}><Save size={14} aria-hidden /> Save</Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <QueueList
                queue={queue}
                index={index}
                onPick={(i) => { setIndex(i); setPlayToken((n) => n + 1); }}
                onMove={(from, to) => {
                  const cur = queue[index]?.event_id;
                  const next = moveItem(queue, from, to);
                  editQueue(next, Math.max(0, next.findIndex((m) => m.event_id === cur)));
                }}
                onRemove={(i) => {
                  const r = removeAt(queue, i, index);
                  editQueue(r.items, r.current);
                }}
              />
            </div>
          </section>
        </div>

        <section aria-label="Matching moments" className="space-y-3">
          <h2 className="text-lg font-semibold">
            {total} {total === 1 ? "moment" : "moments"}
          </h2>
          {results.isPending ? (
            <Spinner label="Finding moments" />
          ) : items.length === 0 ? (
            <p className="panel !rounded-2xl p-8 text-center text-sm text-fg-muted">No moments match these filters.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {items.map((m, i) => (
                  <ClipCard
                    key={m.event_id}
                    m={m}
                    queued={queued.has(m.event_id)}
                    onPlay={() => { setPlaylistId(null); start(items, i); }}
                    onQueue={() => editQueue([...queue, m], queue.length === 0 ? 0 : index)}
                    onFavourite={(fav) => favourite.mutate({ id: m.event_id, fav })}
                  />
                ))}
              </div>
              {results.hasNextPage && (
                <div className="flex justify-center">
                  <Button onClick={() => void results.fetchNextPage()} disabled={results.isFetchingNextPage}>Load more</Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div></details></div>
  );
}
