import { ChevronDown, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useHudlLibrary } from "../api/hudl";
import { TeamBadge } from "../components/TeamBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { useTeamChoice } from "../lib/useTeamChoice";
import { type Record as H2H, bySeason, opponentRecords } from "../lib/headToHead";
import { useScoreCorrections } from "../lib/matchScore";
import { type Team, ageIn, agesIn, allSeasons, cohortOf, inCohort, teamSeasons } from "../lib/teams";
import { useHomeClub } from "../lib/useHomeClub";

const SEASON_KEY = "fm.opponents.season";
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* a convenience only */ } };

function Line({ r }: { r: { played: number; scored: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number } }) {
  return <>
    <span className="tabular-nums">{r.played}</span><span className="tabular-nums">{r.won}</span><span className="tabular-nums">{r.drawn}</span>
    <span className="tabular-nums">{r.lost}</span><span className="tabular-nums">{r.scored ? `${r.goalsFor}-${r.goalsAgainst}` : "-"}</span>
  </>;
}

const GRID = "grid grid-cols-[minmax(0,1fr)_repeat(4,2rem)_3.5rem] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)_4rem_9rem]";

function OpponentRow({ r, team }: { r: H2H; team: Team }) {
  return (
    <details className="group border-t border-line">
      <summary className={`${GRID} cursor-pointer list-none p-3 text-sm hover:bg-white/5`}>
        <span className="flex min-w-0 items-center gap-2"><ChevronDown size={14} className="shrink-0 text-fg-subtle transition group-open:rotate-180" aria-hidden />
          <TeamBadge name={r.opponent} size="sm" tone="away" /><span className="truncate font-medium">{r.opponent}</span></span>
        <Line r={r} />
        <span className="hidden truncate text-xs text-fg-muted sm:block">{r.last?.date ?? ""}{r.last?.score ? ` · ${r.last.score.ours}-${r.last.score.theirs}` : ""}</span>
      </summary>
      <div className="space-y-3 px-3 pb-4 sm:pl-14">
        {bySeason(r).map((s) => (
          <section key={s.season} aria-label={`${r.opponent} ${s.season}`} className="tile p-3">
            <div className={`${GRID} text-xs`}>
              <span className="font-semibold">{s.season} · {ageIn(team, s.season)}</span><Line r={s} /><span className="hidden sm:block" />
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {s.meetings.map((m) => (
                <li key={m.id}><Link to={`/hudl/${encodeURIComponent(m.id)}`} className="flex gap-3 text-fg-muted hover:text-fg">
                  <span className="w-24 shrink-0 tabular-nums">{m.date ?? "Undated"}</span>
                  <span className="w-12 shrink-0 font-semibold tabular-nums text-fg">{m.score ? `${m.score.ours}-${m.score.theirs}` : "no score"}</span>
                  <span className="truncate">{m.title}</span></Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}

/** Spec 230, owner request 2026-11-13: our record against every club, for one team
 *  followed across seasons (U11 in 2026/27 = U10 in 2025/26 = U9 in 2024/25). */
export function OpponentsPage() {
  const library = useHudlLibrary();
  const corrections = useScoreCorrections();
  const club = useHomeClub();
  const [params] = useSearchParams();
  const seasons = allSeasons(library.data);
  const latest = seasons[0];
  const [team, setTeam] = useTeamChoice(library.data, { age: params.get("age"), season: params.get("season") });
  const [season, setSeason] = useState(() => (params.get("age") ? "" : read(SEASON_KEY) ?? ""));
  useEffect(() => { write(SEASON_KEY, season); }, [season]);

  if (library.isPending) return <Spinner label="Loading matches" />;
  if (team === null || !latest) return <EmptyState icon={Swords} title="No dated matches yet">Matches with a date in their Hudl title appear here.</EmptyState>;
  const mine = teamSeasons(library.data, team);
  const shownSeason = season && mine.some((s) => s.season === season) ? season : "";
  const labelSeason = shownSeason || mine[0]?.season || latest;
  const ageOptions = [...new Set([...agesIn(library.data, labelSeason), ageIn(team, labelSeason)])]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const scope = (library.data ?? []).filter((m) => inCohort(m, team) && (!shownSeason || m.season_label === shownSeason));
  const records = opponentRecords(scope, club, corrections.data);
  const others = mine.filter((s) => s.season !== labelSeason);

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div><Link to="/" className="text-sm text-fg-muted">← Library</Link><p className="screen-eyebrow mt-4">HEAD TO HEAD</p><h1 className="text-3xl font-semibold">Opponents</h1></div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-fg-muted">Age group<select className="field mt-1 w-auto" aria-label="Age group" value={ageIn(team, labelSeason)}
            onChange={(e) => { const t = cohortOf(e.target.value, labelSeason); if (t !== null) setTeam(t); }}>
            {ageOptions.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className="text-xs text-fg-muted">Season<select className="field mt-1 w-auto" aria-label="Season" value={shownSeason} onChange={(e) => setSeason(e.target.value)}>
            <option value="">All seasons of this team</option>
            {mine.map((s) => <option key={s.season} value={s.season}>{s.season} ({s.age})</option>)}</select></label>
        </div>
        <p className="text-sm text-fg-muted">
          {club || "Our team"} {ageIn(team, labelSeason)} in {labelSeason}{others.length > 0 && <>, the same team as {others.map((s) => `${s.age} in ${s.season}`).join(", ")}</>}.
          {" "}Results come from goal tags or your corrected scores; matches without a score count as played only. Open a club to see each season and every game.
        </p>
      </header>
      {records.length === 0 ? <p className="panel p-6 text-sm text-fg-muted">No matches for this team{shownSeason ? ` in ${shownSeason}` : ""}.</p> : (
        <div className="panel overflow-hidden p-0" role="list" aria-label="Opponents">
          <div className={`${GRID} p-3 text-xs text-fg-muted`} aria-hidden>
            <span>Opponent</span><span>P</span><span>W</span><span>D</span><span>L</span><span>Goals</span><span className="hidden sm:block">Last meeting</span>
          </div>
          {records.map((r) => <div role="listitem" key={r.opponent}><OpponentRow r={r} team={team} /></div>)}
        </div>
      )}
    </div>
  );
}
