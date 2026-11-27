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

import { downloadState, hudlAgeGroups, useDownloadIndex, useHudlLibrary } from "../api/hudl";
import { HudlLibrary, HudlMatchCard } from "../components/hudl/HudlLibrary";
import { VeoLibrary, VeoMatchCard } from "../components/veo/VeoLibrary";
import { HostedConnectionsNote } from "../components/HostedConnectionsNote";
import { HOSTED } from "../api/helperBase";
import { useHostedPermissions } from "../api/hostedPermissions";
import { HudlHero } from "../components/library/HudlHero";
import { HudlLatestPanel } from "../components/library/HudlLatestPanel";
import { fixtureDate, fixtureLabel, fixtureParts, latestFirst } from "../lib/hudlFixture";
import { useHomeClub } from "../lib/useHomeClub";
import { looksLikePlayer } from "../lib/hudlPlayer";
import { possession, possessionTotals, withPossessionTime } from "../lib/insights";
import { ContinueWatching } from "../components/library/ContinueWatching";
import { useVeoLibrary, veoExpired } from "../api/veo";
import { connectionShown } from "../lib/connections";
import { veoAsHudl } from "../lib/veoAsHudl";
import { teamSplit } from "../lib/veoTeamSplit";
import { useVeoCardClubOf } from "../lib/useVeoClub";

import {GroupedTournaments,groupedTournamentsEnabled,type GroupedLibraryGame} from "../components/library/GroupedTournaments";
import { AutomaticTournaments } from "../components/library/AutomaticTournaments";
import { TournamentProvider, TournamentTools, useTournamentSelection } from "../components/library/Tournaments";
import { matchScore, useScoreCorrections } from "../lib/matchScore";
import type { MatchSummary } from "../api/types";

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
  return <TournamentProvider compact={groupedTournamentsEnabled()}><LibraryContent /></TournamentProvider>;
}

function fixtureDay(title:string):string|null {
  const day=fixtureDate(title);
  return day?`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,"0")}-${String(day.getDate()).padStart(2,"0")}`:null;
}

function LibraryContent() {
  const groupedPreview=groupedTournamentsEnabled();
  const tournament = useTournamentSelection()!;
  const corrections = useScoreCorrections();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const {age:ageGroup,setAge:setAgeGroup,season:seasonLabel,setSeason:setSeasonLabel} = useArchiveFilters();
  const hostedPerms = useHostedPermissions();
  const hudlLibrary = useHudlLibrary();
  const veoQuery = useVeoLibrary();
  // Owner request 2026-11-26: "for veo don't show expired matches" (hero, counts, tournaments).
  const veoLibrary = { ...veoQuery, data: veoQuery.data?.filter(m => !veoExpired(m)) };
  const downloaded=downloadState(useDownloadIndex().data);
  // Owner request 2026-11-14: Show Hudl off with Show Veo on puts Veo matches in the
  // hero, latest match, overview and match profile.
  const showHudl = connectionShown("hudl");
  const showVeo = connectionShown("veo");
  const veoOnly = !showHudl && showVeo;
  // Owner report 2026-11-20: with Hudl shown, Veo matches were left out of the hero,
  // counts and overview, so a Veo-only account showed "No matches yet". Shown Veo
  // matches now always join them (after Hudl's, so a same-day Hudl match leads).
  const veoRemote = showVeo ? veoLibrary.data?.map(veoAsHudl) : [];
  const remote = showHudl
    ? { ...hudlLibrary, data: hudlLibrary.data || veoRemote?.length ? [...(hudlLibrary.data ?? []), ...(veoRemote ?? [])] : undefined }
    : { ...hudlLibrary, data: veoRemote ?? [] };
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

  // Tournament groups may contain imported matches beyond the first library page.
  const tournamentMatches = useQuery({
    queryKey: ["tournament-imports", seasonId, ageGroup],
    enabled: Boolean(groupedPreview || tournament.tournamentId || seasonLabel || ageGroup),
    queryFn: async () => {
      const all: MatchSummary[] = [];
      let page = 1;
      while (true) {
        const result = await api.matches({seasonId, ageGroup, page, pageSize: 100});
        all.push(...result.items);
        if (!result.items.length || page * result.page_size >= result.total) break;
        page++;
      }
      return all;
    },
  });
  const items = (matches.data?.pages.flatMap((p) => p.items) ?? []).filter(m => !seasonLabel || m.season_label === seasonLabel);
  const tournamentItems = (tournamentMatches.data ?? items).filter(m => (!q || `${m.team_name} ${m.opponent} ${m.competition ?? ""}`.toLowerCase().includes(q.toLowerCase())) && (!seasonLabel || m.season_label === seasonLabel) && tournament.includes(`local:${m.id}`));
  const displayedItems = tournament.tournamentId ? tournamentItems : items;
  const ageGroups = [...new Set([...(remote.data ?? []).flatMap(hudlAgeGroups), ...items.map(m => m.age_group), ...(latest.data?.items ?? []).map(m => m.age_group)].filter((a): a is string => Boolean(a)))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const seasonLabels = [...new Set([...(seasons.data ?? []).map(s => s.name), ...(remote.data ?? []).map(m => m.season_label || "Unclassified")])].sort().reverse();
  useEffect(() => { if (remote.isSuccess && !remote.isFetching && ageGroup && ageGroups.length && !ageGroups.includes(ageGroup)) {setAgeGroup("");localStorage.removeItem("fm.hudl.age");} }, [remote.data, latest.data, ageGroup]);
  const total = seasonLabel && seasonId === undefined ? 0 : matches.data?.pages[0]?.total ?? 0;
  const remoteShown = (remote.data ?? []).filter(m => (!ageGroup || hudlAgeGroups(m).includes(ageGroup)) && (!seasonLabel || (m.season_label || "Unclassified") === seasonLabel) && tournament.includes(`${m.source === "veo" ? "veo" : "hudl"}:${m.id}`) && (!q || m.title.toLowerCase().includes(q.toLowerCase())));
  const remoteCount = remoteShown.length;
  const veoCount = remoteShown.filter(m => m.source === "veo").length;
  const filtering = Boolean(q || ageGroup || seasonLabel || tournament.tournamentId);
  const s = stats.data;
  const featured = latest.data?.items ?? [];
  const heroMatches = latestFirst((remote.data ?? []).filter(m => (!ageGroup || hudlAgeGroups(m).includes(ageGroup)) && (!seasonLabel || m.season_label === seasonLabel)));
  // Our side: the player's "Plays for", else the newest imported team (owner report 2026-11-12).
  const hudlClub = useHomeClub();
  const veoClubOf = useVeoCardClubOf();
  // Owner request 2026-11-11: the right panel and the Match Profile follow the match shown
  // in the hero; the overview counts the selected age group and season.
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => setHeroIndex(0), [ageGroup, seasonLabel]);
  const shown = heroMatches[Math.min(heroIndex, heroMatches.length - 1)];
  // Owner request 2026-11-15: the Veo account films more than one club; name the shown match's.
  const club = shown?.source === "veo" ? veoClubOf(veoLibrary.data?.find(m => m.id === shown.id)) || hudlClub : hudlClub;
  const profileKinds = shown ? matchProfile(shown.moments ?? []) : s?.top_tags ?? [];
  // Owner request 2026-11-15: a Veo match's profile is Veo's team events, us v them
  // (its highlights carry no side).
  const veoShown = shown?.source === "veo" ? veoLibrary.data?.find(m => m.id === shown.id) : undefined;
  const veoAxes = teamSplit(veoShown?.team_data).map(r => ({ name: r.label, ours: r.own, theirs: r.opponent }));
  const profileTeams = veoAxes.length ? { axes: veoAxes, neutral: [] }
    : shown ? withPossessionTime(teamProfile(shown.moments ?? [], club), possession(shown.moments ?? [], club)) : null;
  const opponent = shown ? fixtureParts(shown.title, club)?.opponent ?? "Opposition" : "Opposition";
  const scoped = Boolean(remote.data?.length);
  const scopedMoments = heroMatches.reduce((n, m) => n + (m.moments?.length ?? 0), 0) + items.reduce((n, m) => n + m.event_count, 0);
  const scopedSeconds = heroMatches.reduce((n, m) => n + (m.duration_s ?? 0), 0) + items.reduce((n, m) => n + (m.duration_s ?? 0), 0);
  const scopedPlayers = new Set(heroMatches.flatMap((m) => (m.moments ?? []).map((t) => t.category)).filter(looksLikePlayer)).size;
  const overview = scoped
    ? { matches: heroMatches.length + items.length, moments: scopedMoments, seconds: scopedSeconds, players: scopedPlayers,
        teams: new Set(items.map((m) => m.team_name)).size + (heroMatches.length ? 1 : 0) }
    : s && { matches: s.matches, moments: s.moments, seconds: s.footage_seconds, players: s.players, teams: s.teams };
  const scopeLabel = scoped ? `${ageGroup || "All ages"} · ${seasonLabel || "All seasons"}` : "All time";

  const tournamentScores=[
    ...(hudlLibrary.data??[]).filter(m=>tournament.memberships.has(`hudl:${m.id}`)).map(m=>({key:`hudl:${m.id}`,score:matchScore(m,hudlClub,corrections.data)})),
    ...(veoLibrary.data??[]).filter(m=>tournament.memberships.has(`veo:${m.id}`)).map(m=>({key:`veo:${m.id}`,score:matchScore(veoAsHudl(m),veoClubOf(m),corrections.data)})),
  ];
  const eligibleKeys=[
    ...(tournamentMatches.data??[]).filter(m=>!seasonLabel||m.season_label===seasonLabel).map(m=>`local:${m.id}`),
    ...(hudlLibrary.data??[]).filter(m=>(!ageGroup||hudlAgeGroups(m).includes(ageGroup))&&(!seasonLabel||m.season_label===seasonLabel)).map(m=>`hudl:${m.id}`),
    ...(veoLibrary.data??[]).map(veoAsHudl).filter(m=>(!ageGroup||hudlAgeGroups(m).includes(ageGroup))&&(!seasonLabel||m.season_label===seasonLabel)).map(m=>`veo:${m.id}`),
  ];
  const groupedGames:GroupedLibraryGame[]=groupedPreview?[
    ...(tournamentMatches.data??[]).map(m=>({key:`local:${m.id}`,title:`${m.team_name} vs ${m.opponent}`,href:`/matches/${m.id}`,date:m.match_date,source:"Offline",thumbnail:m.thumbnail_url,score:()=>null,homeClub:m.team_name,renderCard:()=> <MatchCard match={m}/>})),
    ...(showHudl?hudlLibrary.data??[]:[]).map(m=>({key:`hudl:${m.id}`,title:m.title,href:`/hudl/${encodeURIComponent(m.id)}`,date:fixtureDay(m.title),source:"Hudl",thumbnail:m.thumbnail_url,score:()=>matchScore(m,hudlClub,corrections.data),homeClub:hudlClub,renderCard:()=> <HudlMatchCard match={m} club={hudlClub} score={matchScore(m,hudlClub,corrections.data)} saved={downloaded.get(m.id)}/>})),
    ...(showVeo?veoLibrary.data??[]:[]).map(m=>({key:`veo:${m.id}`,title:m.title,href:`/veo/${encodeURIComponent(m.id)}`,date:fixtureDay(m.title),source:"Veo",thumbnail:m.poster_url,score:()=>matchScore(veoAsHudl(m),veoClubOf(m),corrections.data),homeClub:veoClubOf(m),renderCard:()=> <VeoMatchCard match={m} club={veoClubOf(m)}/>})),
  ].sort((a,b)=>(b.date??"").localeCompare(a.date??"")||a.title.localeCompare(b.title)):[];


  return (
    <div className="library-dashboard">
      <header className="dashboard-heading">
        <div><p className="screen-eyebrow">YOUR FOOTBALL ARCHIVE</p><h1>Match Library</h1>
        <p>Every game. Every moment. Your football story.</p></div>
        {/* Owner request 2026-11-27: Opponents moved to the top navigation bar. */}
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/import" className="dashboard-import">+ Import a match</Link>
        </div>
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
        <MatchProfile kinds={profileKinds} team={profileTeams} ours={club || "Home"} theirs={opponent} scope={shown ? fixtureLabel(shown.title, club, ageGroup || hudlAgeGroups(shown)[0]) : "All matches"}
          possession={shown ? possession(shown.moments ?? [], club) : null}
          seasonPossession={heroMatches.length > 1 ? possessionTotals(heroMatches.map((m) => m.moments ?? []), club) : null}
          links={remote.data?.length ? <>
            {shown && <Link className="text-accent hover:underline" to={`/report/match/${encodeURIComponent(shown.id)}`}>Share match report</Link>}
            <Link className="text-accent hover:underline" to="/report/season">Share season report</Link>
          </> : undefined} />
      </aside>

      {/* Right: latest match + recent moments (reference 1 right column) */}
      <div className="dashboard-latest">
        {shown ? <HudlLatestPanel match={shown} club={club} age={ageGroup} latest={heroIndex === 0} teamMoments={veoShown?.team_moments} />
          : <LatestMatchPanel match={featured[0]} moments={s?.recent_moments ?? []} />}
      </div>

      {/* Centre: featured hero + all matches */}
      <div className="dashboard-centre min-w-0 space-y-6">
        {heroMatches.length > 0 ? <HudlHero key={ageGroup} matches={heroMatches} club={club} age={ageGroup} index={Math.min(heroIndex, heroMatches.length - 1)} onIndex={setHeroIndex} />
          : featured.length > 0 && <FeaturedHero matches={featured} />}
        {!veoOnly && <ContinueWatching library={hudlLibrary.data} club={club} />}

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
                {tournament.tournamentId ? displayedItems.length : total} offline{showHudl && ` · ${remoteCount - veoCount} Hudl`}{showVeo && ` · ${veoCount} Veo`}
              </span>
            )}
          </div>

          <AutomaticTournaments hudl={hudlLibrary.data} veo={veoLibrary.data} club={hudlClub} veoClubOf={veoClubOf}
            importedVersion={latest.data?.total ? latest.dataUpdatedAt : 0} />
          {groupedPreview?<GroupedTournaments games={groupedGames} eligibleKeys={eligibleKeys.filter(key=>groupedGames.some(g=>g.key===key))} scores={tournamentScores} search={q}
            scoresLoading={corrections.isFetching||hudlLibrary.isFetching||veoLibrary.isFetching} scoreError={corrections.isError||(showHudl&&hudlLibrary.isError)||(showVeo&&veoLibrary.isError)}
            loading={(tournamentMatches.isPending&&tournamentMatches.isFetching)||(showHudl&&hudlLibrary.isPending&&hudlLibrary.isFetching)||(showVeo&&veoLibrary.isPending&&veoLibrary.isFetching)} scopeLoading={tournamentMatches.isFetching||hudlLibrary.isFetching||veoLibrary.isFetching}
            error={matches.isError||tournamentMatches.isError||(showHudl&&hudlLibrary.isError)||(showVeo&&veoLibrary.isError)} sources={[...(showHudl?["Hudl"]:[]),...(showVeo?["Veo"]:[])]}/>:<>
          <TournamentTools eligibleKeys={ageGroup||seasonLabel?eligibleKeys:undefined} scopeLoading={tournamentMatches.isFetching||hudlLibrary.isFetching||veoLibrary.isFetching} games={tournamentScores}
            loading={hudlLibrary.isFetching||veoLibrary.isFetching||corrections.isFetching} scoreError={(showHudl&&hudlLibrary.isError)||(showVeo&&veoLibrary.isError)||corrections.isError}/>


          {matches.isPending ? (
            <Spinner label="Loading matches" />
          ) : matches.isError || (tournament.tournamentId && tournamentMatches.isError) ? (
            <p className="text-sm text-danger">Could not load the library: {(matches.error ?? tournamentMatches.error)?.message}</p>
          ) : displayedItems.length === 0 ? remoteCount > 0 ? null : (
            <p className="py-10 text-center text-sm text-fg-muted">{remote.data?.length ? "No offline matches match these filters." : filtering ? "No matches found for these filters." : "No matches yet."}</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {displayedItems.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
              {!tournament.tournamentId && matches.hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <Button onClick={() => void matches.fetchNextPage()} disabled={matches.isFetchingNextPage}>
                    {matches.isFetchingNextPage ? "Loading" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
          <div className="mt-5"><HudlLibrary filters={{age:ageGroup,season:seasonLabel,search:q}} club={club} /></div>
          <div className="mt-5"><VeoLibrary filters={{age:ageGroup,season:seasonLabel,search:q}} /></div>
          </>}
          {HOSTED && !hostedPerms.data?.hudl && !hostedPerms.data?.veo && <div className="mt-5"><HostedConnectionsNote /></div>}
        </section>
      </div>
    </div>
  );
}
