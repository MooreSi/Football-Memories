import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Clock3, Film, Search, Sparkles, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { FeaturedHero } from "../components/library/FeaturedHero";
import { LatestMatchPanel } from "../components/library/LatestMatchPanel";
import { MatchProfile } from "../components/library/MatchProfile";
import { matchProfile, teamProfile } from "../lib/matchProfile";
import { StatTile } from "../components/library/StatTile";
import { YourPlayerCard } from "../components/library/YourPlayerCard";
import { MatchCard } from "../components/MatchCard";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";

import { hudlAgeGroups, useHudlLibrary } from "../api/hudl";
import { HudlLibrary } from "../components/hudl/HudlLibrary";
import { HudlHero } from "../components/library/HudlHero";
import { HudlLatestPanel } from "../components/library/HudlLatestPanel";
import { fixtureLabel, fixtureParts, latestFirst } from "../lib/hudlFixture";
import { useHomeClub } from "../lib/useHomeClub";
import { looksLikePlayer } from "../lib/hudlPlayer";

import { useArchiveFilters } from "../lib/archiveFilters";

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
  const {age:ageGroup,setAge:setAgeGroup,season:seasonLabel,setSeason:setSeasonLabel} = useArchiveFilters();
  const remote = useHudlLibrary();
  const q = useDebounced(search.trim(), 250);

  useEffect(() => setSearch(params.get("q") ?? ""), [params]);

  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats });
  const seasons = useQuery({ queryKey: ["seasons"], queryFn: api.seasons });
  const latest = useQuery({ queryKey: ["matches", "latest"], queryFn: () => api.matches({ page: 1, pageSize: 5 }) });
  const seasonId = seasons.data?.find(s => s.name === seasonLabel)?.id;
  const matches = useInfiniteQuery({
    queryKey: ["matches", q, seasonId, ageGroup],
    queryFn: ({ pageParam }) => api.matches({ q, seasonId, ageGroup, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
  });

  const items = (matches.data?.pages.flatMap((p) => p.items) ?? []).filter(m => !seasonLabel || m.season_label === seasonLabel);
  const ageGroups = [...new Set([...(remote.data ?? []).flatMap(hudlAgeGroups), ...items.map(m => m.age_group), ...(latest.data?.items ?? []).map(m => m.age_group)].filter((a): a is string => Boolean(a)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const seasonLabels = [...new Set([...(seasons.data ?? []).map(s => s.name), ...(remote.data ?? []).map(m => m.season_label || "Unclassified")])].sort().reverse();
  useEffect(() => { if (remote.isSuccess && !remote.isFetching && ageGroup && ageGroups.length && !ageGroups.includes(ageGroup)) {setAgeGroup("");localStorage.removeItem("fm.hudl.age");} }, [remote.data, latest.data, ageGroup]);
  const total = seasonLabel && seasonId === undefined ? 0 : matches.data?.pages[0]?.total ?? 0;
  const remoteCount = (remote.data ?? []).filter(m => (!ageGroup || hudlAgeGroups(m).includes(ageGroup)) && (!seasonLabel || (m.season_label || "Unclassified") === seasonLabel) && (!q || m.title.toLowerCase().includes(q.toLowerCase()))).length;
  const filtering = Boolean(q || ageGroup || seasonLabel);
  const s = stats.data;
  const featured = latest.data?.items ?? [];
  const heroMatches = latestFirst((remote.data ?? []).filter(m => (!ageGroup || hudlAgeGroups(m).includes(ageGroup)) && (!seasonLabel || m.season_label === seasonLabel)));
  // Our side: the player's "Plays for", else the newest imported team (owner report 2026-11-12).
  const club = useHomeClub();
  // Owner request 2026-11-11: the right panel and the Match Profile follow the match shown
  // in the hero; the overview counts the selected age group and season.
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => setHeroIndex(0), [ageGroup, seasonLabel]);
  const shown = heroMatches[Math.min(heroIndex, heroMatches.length - 1)];
  const profileKinds = shown ? matchProfile(shown.moments ?? []) : s?.top_tags ?? [];
  const profileTeams = shown ? teamProfile(shown.moments ?? [], club) : null;
  const opponent = shown ? fixtureParts(shown.title)?.opponent ?? "Opposition" : "Opposition";
  const scoped = Boolean(remote.data?.length);
  const scopedMoments = heroMatches.reduce((n, m) => n + (m.moments?.length ?? 0), 0) + items.reduce((n, m) => n + m.event_count, 0);
  const scopedSeconds = heroMatches.reduce((n, m) => n + (m.duration_s ?? 0), 0) + items.reduce((n, m) => n + (m.duration_s ?? 0), 0);
  const scopedPlayers = new Set(heroMatches.flatMap((m) => (m.moments ?? []).map((t) => t.category)).filter(looksLikePlayer)).size;
  const overview = scoped
    ? { matches: heroMatches.length + items.length, moments: scopedMoments, seconds: scopedSeconds, players: scopedPlayers,
        teams: new Set(items.map((m) => m.team_name)).size + (heroMatches.length ? 1 : 0) }
    : s && { matches: s.matches, moments: s.moments, seconds: s.footage_seconds, players: s.players, teams: s.teams };
  const scopeLabel = scoped ? `${ageGroup || "All ages"} · ${seasonLabel || "All seasons"}` : "All time";


  return (
    <div className="library-dashboard">
      <header className="dashboard-heading">
        <div><p className="screen-eyebrow">YOUR FOOTBALL ARCHIVE</p><h1>Match Library</h1>
        <p>Every game. Every moment. Your football story.</p></div>
        <Link to="/import" className="dashboard-import">+ Import a match</Link>
      </header>
      <aside className="dashboard-overview space-y-5">
        <YourPlayerCard />
        <section aria-label="Overview" className="space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Overview</h2>
          <span className="text-sm text-fg-subtle">{scopeLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Matches" icon={Film} value={String(overview?.matches ?? "-")} unit={scoped ? "matches" : "saved"} hint={overview ? `${overview.teams} ${overview.teams === 1 ? "team" : "teams"}` : undefined} />
          <StatTile label="Moments" icon={Sparkles} value={String(overview?.moments ?? "-")} unit="tagged" />
          <StatTile label="Footage" icon={Clock3} value={overview ? hours(overview.seconds) : "-"} unit="hours" />
          <StatTile label="Players" icon={Users} value={String(overview?.players ?? "-")} unit="tagged" />
        </div>
        </section>
        <MatchProfile kinds={profileKinds} team={profileTeams} ours={club || "Home"} theirs={opponent} scope={shown ? fixtureLabel(shown.title, club, ageGroup || hudlAgeGroups(shown)[0]) : "All matches"} />
      </aside>

      {/* Right: latest match + recent moments (reference 1 right column) */}
      <div className="dashboard-latest">
        {shown ? <HudlLatestPanel match={shown} club={club} age={ageGroup} latest={heroIndex === 0} />
          : <LatestMatchPanel match={featured[0]} moments={s?.recent_moments ?? []} />}
      </div>

      {/* Centre: featured hero + all matches */}
      <div className="dashboard-centre min-w-0 space-y-6">
        {heroMatches.length > 0 ? <HudlHero key={ageGroup} matches={heroMatches} club={club} age={ageGroup} index={Math.min(heroIndex, heroMatches.length - 1)} onIndex={setHeroIndex} />
          : featured.length > 0 && <FeaturedHero matches={featured} />}

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
              <span className="sr-only">Season</span>
              <select className="field w-auto rounded-full" aria-label="Season" value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)}>
                <option value="">All seasons</option>
                {seasonLabels.map(label => <option key={label} value={label}>{label}</option>)}
              </select>
            </label>
            <label><span className="sr-only">Age group</span><select className="field w-auto rounded-full" aria-label="Age group" value={ageGroup} onChange={e=>setAgeGroup(e.target.value)}><option value="">All age groups</option>{ageGroups.map(age=><option key={age}>{age}</option>)}</select></label>
            {!matches.isPending && (
              <span className="text-xs text-fg-muted">
                {total} offline · {remoteCount} Hudl
              </span>
            )}
          </div>

          {matches.isPending ? (
            <Spinner label="Loading matches" />
          ) : matches.isError ? (
            <p className="text-sm text-danger">Could not load the library: {(matches.error as Error).message}</p>
          ) : items.length === 0 ? remoteCount > 0 ? null : (
            <p className="py-10 text-center text-sm text-fg-muted">{remote.data?.length ? "No offline matches match these filters." : filtering ? "No matches found for these filters." : "No matches yet."}</p>
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
          <div className="mt-5"><HudlLibrary filters={{age:ageGroup,season:seasonLabel,search:q}} /></div>
        </section>
      </div>
    </div>
  );
}
