import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { api } from "../api/client";
import { useTournaments } from "../api/tournaments";
import { useHudlLibrary } from "../api/hudl";
import { useVeoLibrary } from "../api/veo";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { connectionShown } from "../lib/connections";
import { fixtureDate } from "../lib/hudlFixture";
import { matchScore, taggedScore, useScoreCorrections } from "../lib/matchScore";
import { tournamentReport, type TournamentReportGame } from "../lib/tournamentReport";
import { useHomeClub } from "../lib/useHomeClub";
import { useVeoCardClubOf } from "../lib/useVeoClub";
import { veoAsHudl } from "../lib/veoAsHudl";
import { ReportCard, savePng, useCrest } from "./ReportPage";

function fixtureDay(title: string) {
  const date = fixtureDate(title);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : null;
}

/** A cached-metadata report: opening it never refreshes, indexes or streams a source. */
export function TournamentReportPage() {
  const { id } = useParams();
  useEffect(() => window.scrollTo(0, 0), [id]);
  const [params, setParams] = useSearchParams();
  const tournaments = useTournaments();
  const tournament = tournaments.data?.find(t => t.id === id);
  const hudl = useHudlLibrary(), veo = useVeoLibrary(), corrections = useScoreCorrections();
  const home = useHomeClub(), veoClubOf = useVeoCardClubOf();
  const showHudl = connectionShown("hudl"), showVeo = connectionShown("veo");
  const keys = Object.keys(tournament?.entries ?? {}).filter(key => key.startsWith("local:")).sort();
  const local = useQuery({ queryKey: ["tournament-report-local", keys], enabled: keys.length > 0, retry: false,
    queryFn: async () => {
      const games: TournamentReportGame[] = [];
      let failed = 0;
      // Only this tournament's imported metadata, bounded like the Library score panel.
      for (let i = 0; i < keys.length; i += 4) {
        const batch = await Promise.allSettled(keys.slice(i, i + 4).map(async key => {
          const match = await api.match(Number(key.slice(6)));
          return { key, title: `${match.team_name} v ${match.opponent}`, date: match.match_date, club: match.team_name,
            scoreNote: "From tags", score: taggedScore(match.events.map(event => ({ ...event, id: String(event.id) })), match.team_name) };
        }));
        for (const result of batch) { if (result.status === "fulfilled") games.push(result.value); else failed++; }
      }
      return { games, failed };
    },
  });
  const teams = [...new Set(Object.values(tournament?.entries ?? {}))].filter(team => team !== "Team unassigned").sort();
  const requested = params.get("team") ?? "";
  const team = teams.includes(requested) ? requested : "";
  const games: TournamentReportGame[] = [
    ...(showHudl ? hudl.data ?? [] : []).filter(m => tournament?.entries[`hudl:${m.id}`]).map(m => {
      const club = tournament?.automatic?.[`hudl:${m.id}`]?.club || home;
      return { key: `hudl:${m.id}`, title: m.title, date: fixtureDay(m.title), club, scoreNote: corrections.data?.[m.id] ? "Corrected" : "From tags", score: corrections.isError ? null : matchScore(m, club, corrections.data) };
    }),
    ...(showVeo ? veo.data ?? [] : []).filter(m => tournament?.entries[`veo:${m.id}`]).map(m => ({ key: `veo:${m.id}`, title: m.title,
      date: fixtureDay(m.title), club: veoClubOf(m), scoreNote: corrections.data?.[m.id] ? "Corrected" : "Veo", score: corrections.isError ? null : matchScore(veoAsHudl(m), veoClubOf(m), corrections.data) })),
    ...(local.data?.games ?? []),
  ];
  const report = tournament ? tournamentReport(tournament, games, team) : null;
  const crest = useCrest(report?.ours ?? null);
  const card = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  if (tournaments.isPending) return <Spinner label="Loading tournament" />;
  if (tournaments.isError) return <div className="panel p-6"><Link to="/">← Library</Link><p role="alert" className="my-3">Could not load tournaments.</p><Button onClick={() => void tournaments.refetch()}>Retry</Button></div>;
  if (!tournament || !report) return <div className="panel p-6"><Link to="/">← Library</Link><p className="mt-3">This tournament is no longer available.</p></div>;
  if (showHudl && hudl.isLoading || showVeo && veo.isLoading || corrections.isLoading || keys.length > 0 && local.isLoading) return <Spinner label="Loading tournament scores" />;
  const incomplete = showHudl && hudl.isError || showVeo && veo.isError || local.isError || Boolean(local.data?.failed);
  const filename = `${tournament.name}${team ? ` ${team}` : ""} report`.replace(/[^\w -]+/g, "").trim() || "tournament-report";
  return <div className="report-page tournament-report-page space-y-5">
    <header className="no-print flex flex-wrap items-end gap-3">
      <div className="mr-auto min-w-0"><Link to="/" className="text-sm text-fg-muted">← Library</Link>
        <h1 className="mt-3 text-2xl font-semibold">Tournament report</h1>
        <p className="text-sm text-fg-muted">Whole-event results and squad totals. Save an image or print to PDF.</p>
        <label className="mt-3 block text-xs text-fg-muted">Squad<select className="field mt-1 max-w-full" aria-label="Squad" value={team}
          onChange={e => setParams(e.target.value ? { team: e.target.value } : {})}>
          <option value="">All squads</option>{teams.map(squad => <option key={squad} value={squad}>{squad}</option>)}
        </select></label>
      </div>
      <Button variant="primary" onClick={() => { setError(""); const svg = card.current?.querySelector("svg"); if (svg) savePng(svg, filename).catch((e: Error) => setError(e.message)); }}><Download size={16} />Save image</Button>
      <Button onClick={() => window.print()}><Printer size={16} />Print / Save as PDF</Button>
    </header>
    {incomplete && <p role="alert" className="no-print text-sm text-warn">Some cached match details could not be loaded. Missing scores are excluded from totals. Reload to retry.</p>}
    {corrections.isError && <p role="alert" className="no-print text-sm text-warn">Saved score corrections could not be loaded. Connected match scores are excluded. Reload to retry.</p>}
    {error && <p role="alert" className="no-print text-sm text-danger">{error}</p>}
    <div ref={card} className="report-card flex justify-center"><ReportCard report={report} crests={{ ours: crest.data?.url, square: { ours: crest.data?.square } }} /></div>
    <article className="tournament-print-report" aria-label="Printable tournament report">
      <header><p>Tournament report · Football Memories</p><h1>{report.title}</h1><p>{report.subtitle}</p>{report.headline && <p>{report.headline}</p>}</header>
      {report.record && <dl className="tournament-print-record">{[["Played", report.record.played], ["Won", report.record.won], ["Drawn", report.record.drawn], ["Lost", report.record.lost]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <dl>{report.lines.map((line, i) => <div className="tournament-print-row" key={i}><dt>{line.label}</dt><dd>{line.value}</dd></div>)}</dl>
      <footer>Recorded results and score corrections. Unknown scores and games needing squad review are excluded from totals.</footer>
    </article>
  </div>;
}
