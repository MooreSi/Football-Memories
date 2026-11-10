import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Clock3, Film, Search, Sparkles, Tags, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { FeaturedHero } from "../components/library/FeaturedHero";
import { LatestMatchPanel } from "../components/library/LatestMatchPanel";
import { StatTile } from "../components/library/StatTile";
import { YourPlayerCard } from "../components/library/YourPlayerCard";
import { MatchCard } from "../components/MatchCard";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";

import { HudlLibrary } from "../components/hudl/HudlLibrary";

const PAGE_SIZE = 24;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function hours(seconds: number): string {
  const h = seconds / 3600;
  return h >= 10 ? h.toFixed(0) : h.toFixed(1);
}

/** Layout follows reference 1: overview tiles left, featured hero + library centre, latest match right. */
export function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [teamId, setTeamId] = useState<number | undefined>();
  const [seasonId, setSeasonId] = useState<number | undefined>();
  const q = useDebounced(search.trim(), 250);

  useEffect(() => setSearch(params.get("q") ?? ""), [params]);

  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const seasons = useQuery({ queryKey: ["seasons"], queryFn: api.seasons });
  const latest = useQuery({ queryKey: ["matches", "latest"], queryFn: () => api.matches({ page: 1, pageSize: 5 }) });
  const matches = useInfiniteQuery({
    queryKey: ["matches", q, teamId, seasonId],
    queryFn: ({ pageParam }) => api.matches({ q, teamId, seasonId, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
  });

  const items = matches.data?.pages.flatMap((p) => p.items) ?? [];
  const total = matches.data?.pages[0]?.total ?? 0;
  const filtering = Boolean(q || teamId || seasonId);
  const s = stats.data;
  const featured = latest.data?.items ?? [];
  const archiveEmpty = latest.data?.total === 0;
  const maxTag = Math.max(1, ...(s?.top_tags.map((t) => t.count) ?? [1]));

  if (archiveEmpty) {
    return (
      <>
      <HudlLibrary />
      <EmptyState icon={Film} title="No matches yet">
        <p className="mb-4">Put a match video in the import folder, then import it to start your archive.</p>
        <Link to="/import" className="font-medium text-accent hover:underline">
          Import a match
        </Link>
      </EmptyState></>
    );
  }

  return (
    <div className="library-dashboard">
      <header className="dashboard-heading">
        <div><p className="screen-eyebrow">YOUR FOOTBALL ARCHIVE</p><h1>Match Library</h1>
        <p>Every game. Every moment. Your football story.</p></div>
        <Link to="/import" className="dashboard-import">+ Import a match</Link>
      </header>
      <HudlLibrary />
      <aside className="dashboard-overview space-y-5">
        <YourPlayerCard />
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Overview</h2>
          <span className="text-sm text-fg-subtle">All time</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Matches" icon={Film} value={String(s?.matches ?? "-")} unit="saved" hint={s ? `${s.teams} ${s.teams === 1 ? "team" : "teams"}` : undefined} />
          <StatTile label="Moments" icon={Sparkles} value={String(s?.moments ?? "-")} unit="tagged" />
          <StatTile label="Footage" icon={Clock3} value={s ? hours(s.footage_seconds) : "-"} unit="hours" />
          <StatTile label="Players" icon={Users} value={String(s?.players ?? "-")} unit="tagged" />
        </div>
        <section aria-label="Top tags" className="panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Most tagged</h2>
            <Tags size={16} className="text-fg-subtle" aria-hidden />
          </div>
          {s && s.top_tags.length > 0 ? (
            <ul className="space-y-3">
              {s.top_tags.map((t) => (
                <li key={t.name} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                  <span className="truncate text-sm">{t.name}</span>
                  <span className="text-sm text-fg-muted tabular-nums">{t.count}</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <span className="block h-full rounded-full bg-gradient-to-r from-ok to-accent" style={{ width: `${(t.count / maxTag) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">No tags yet.</p>
          )}
        </section>
      </aside>

      {/* Right: latest match + recent moments (reference 1 right column) */}
      <div className="dashboard-latest">
        <LatestMatchPanel match={featured[0]} moments={s?.recent_moments ?? []} />
      </div>

      {/* Centre: featured hero + all matches */}
      <div className="dashboard-centre min-w-0 space-y-6">
        {featured.length > 0 && <FeaturedHero matches={featured} />}

        <section aria-label="All matches" className="match-collection panel p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-xl font-semibold">All matches</h2>
            <label className="relative min-w-[200px] flex-1 sm:flex-none">
              <span className="sr-only">Search matches</span>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <input
                className="field rounded-full pl-9"
                placeholder="Opponent, team, competition"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (params.get("q")) setParams({}, { replace: true });
                }}
              />
            </label>
            <label>
              <span className="sr-only">Team</span>
              <select className="field w-auto rounded-full" value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">All teams</option>
                {teams.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Season</span>
              <select className="field w-auto rounded-full" value={seasonId ?? ""} onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : undefined)}>
                <option value="">All seasons</option>
                {seasons.data?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
            {!matches.isPending && (
              <span className="text-xs text-fg-muted">
                {total} {total === 1 ? "match" : "matches"}
              </span>
            )}
          </div>

          {matches.isPending ? (
            <Spinner label="Loading matches" />
          ) : matches.isError ? (
            <p className="text-sm text-danger">Could not load the library: {(matches.error as Error).message}</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-muted">{filtering ? "No matches found for these filters." : "No matches yet."}</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
              {matches.hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button onClick={() => void matches.fetchNextPage()} disabled={matches.isFetchingNextPage}>
                    {matches.isFetchingNextPage ? "Loading" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
