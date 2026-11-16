import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useHudlLibrary } from "../api/hudl";
import { useVeoLibrary } from "../api/veo";
import { connectionShown } from "../lib/connections";
import { matchLink, veoAsHudl } from "../lib/veoAsHudl";
import { useVeoTeam } from "../lib/useHomeTeams";
import { veoClubNames, veoClubOf } from "../lib/veoClubs";
import { teamSplit } from "../lib/veoTeamSplit";
import { OURS, THEIRS } from "../lib/teamColours";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useTeamChoice } from "../lib/useTeamChoice";
import { ageIn, agesIn, cohortOf, inCohort, teamSeasons } from "../lib/teams";
import { useScoreCorrections } from "../lib/matchScore";
import { type MatchGoals, matchGoals, useGoalEntries } from "../lib/goals";
import { type Report, matchReport, seasonReport } from "../lib/report";
import { useHomeClub } from "../lib/useHomeClub";
import { fixtureParts } from "../lib/hudlFixture";
import { initials } from "../components/TeamBadge";
import { trimCrest } from "../lib/crestTrim";
import { REPORT_MARGIN, REPORT_WIDTH, ROW_FONT, VALUE_LINE, VALUE_SIZE, fitTitle, layoutRows, wrapText } from "../lib/reportLayout";
import { usePrimaryPlayerName } from "../lib/usePrimaryPlayerName";

const W = REPORT_WIDTH;
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** A crest as a data URL, so the card stays self-contained and can become a PNG. */
function useCrest(name: string | null) {
  return useQuery({
    queryKey: ["crest-data", name], enabled: Boolean(name), retry: false, staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch(`/api/team-logo?name=${encodeURIComponent(name!)}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = await new Promise<string | null>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(null); r.readAsDataURL(blob); });
      // Owner report 2026-11-15: crests looked small; crop the file's plain margin.
      const trimmed = url ? await trimCrest(url) : null;
      return url ? { url: trimmed?.url ?? url, square: trimmed ? !trimmed.round : false } : null;
    },
  });
}

function Crest({ cx, cy, r, name, src, square, tone }: { cx: number; cy: number; r: number; name: string; src?: string | null; square?: boolean; tone: "home" | "away" }) {
  // Owner request 2026-11-15: the crest fills its circle (clipped to it), not a small inset;
  // a square or shield crest sits a little smaller, so its corners stay inside.
  const inset = r * (square ? 0.72 : 0.94);
  const clip = `crest-clip-${Math.round(cx)}-${Math.round(cy)}`;
  return <g data-crest={src ? "image" : "initials"}>
    <circle cx={cx} cy={cy} r={r} fill={src ? "#ffffff" : tone === "home" ? "#22d3ee" : "#cbd5e1"} stroke="#ffffff33" strokeWidth={4} />
    {src ? <><clipPath id={clip}><circle cx={cx} cy={cy} r={r - 2} /></clipPath>
      <image href={src} x={cx - inset} y={cy - inset} width={inset * 2} height={inset * 2} preserveAspectRatio="xMidYMid meet" clipPath={`url(#${clip})`} /></>
      : <text x={cx} y={cy + r * 0.22} textAnchor="middle" fontSize={r * 0.62} fontWeight={800} fill="#0b1220">{initials(name)}</text>}
  </g>;
}

function Rows({ rows }: { rows: ReturnType<typeof layoutRows> }) {
  return <>{rows.map((row, i) => <g key={i} data-row={row.stacked ? "stacked" : "inline"}>
    <text x={REPORT_MARGIN} y={row.y} fill="#cbd5e1" fontSize={ROW_FONT}>{row.label}</text>
    {row.stacked
      ? row.value.map((line, j) => <text key={j} x={REPORT_MARGIN} y={row.y + VALUE_LINE * (j + 1)} fill="#fff" fontSize={VALUE_SIZE} fontWeight={700}>{line}</text>)
      : <text x={W - REPORT_MARGIN} y={row.y} textAnchor="end" fill="#fff" fontSize={VALUE_SIZE} fontWeight={700}>{row.value[0]}</text>}
    <line x1={REPORT_MARGIN} x2={W - REPORT_MARGIN} y1={row.bottom - 40} y2={row.bottom - 40} stroke="#ffffff22" />
  </g>)}</>;
}

/** The report as one self-contained SVG (crests embedded), so it can become a PNG. */
export function ReportCard({ report, crests = {} }: { report: Report; crests?: { ours?: string | null; theirs?: string | null; square?: { ours?: boolean; theirs?: boolean } } }) {
  const match = report.kind === "match";
  const mid = W / 2;
  let y: number;
  const head: React.ReactNode[] = [];
  if (match) {
    head.push(<text key="e" x={mid} y={110} textAnchor="middle" fill="#22d3ee" fontSize={28} fontWeight={700} letterSpacing={6}>{report.eyebrow}</text>);
    head.push(<Crest key="c1" cx={230} cy={260} r={95} name={report.ours} src={crests.ours} square={crests.square?.ours} tone="home" />);
    head.push(<Crest key="c2" cx={W - 230} cy={260} r={95} name={report.theirs} src={crests.theirs} square={crests.square?.theirs} tone="away" />);
    head.push(<text key="s" x={mid} y={290} textAnchor="middle" fill="#fff" fontSize={report.headline ? 96 : 56} fontWeight={800}>{report.headline ?? "v"}</text>);
    const names = [report.ours, report.theirs].map((n, i) => {
      const lines = wrapText(n, 32, 300).slice(0, 2);
      return lines.map((line, j) => <text key={`n${i}${j}`} x={i ? W - 230 : 230} y={400 + j * 38} textAnchor="middle" fill="#fff" fontSize={32} fontWeight={700}>{line}</text>);
    });
    head.push(...names.flat());
    head.push(<text key="d" x={mid} y={500} textAnchor="middle" fill="#94a3b8" fontSize={30}>{report.subtitle}</text>);
    y = 560;
  } else {
    head.push(<text key="e" x={REPORT_MARGIN} y={120} fill="#22d3ee" fontSize={28} fontWeight={700} letterSpacing={6}>{report.eyebrow}</text>);
    head.push(<Crest key="c1" cx={REPORT_MARGIN + 75} cy={235} r={75} name={report.ours} src={crests.ours} square={crests.square?.ours} tone="home" />);
    const size = fitTitle(report.title, 60, 28, W - REPORT_MARGIN * 2 - 190);
    head.push(<text key="t" x={REPORT_MARGIN + 180} y={225} fill="#fff" fontSize={size} fontWeight={800}>{report.title}</text>);
    head.push(<text key="s" x={REPORT_MARGIN + 180} y={275} fill="#94a3b8" fontSize={30}>{report.subtitle}</text>);
    if (report.headline) head.push(<text key="h" x={REPORT_MARGIN} y={390} fill="#fff" fontSize={56} fontWeight={800}>{report.headline}</text>);
    y = report.headline ? 440 : 360;
    // Owner request 2026-11-15: games played, won, drawn and lost.
    if (report.record) {
      const r = report.record;
      const gap = 24, box = (W - REPORT_MARGIN * 2 - gap * 3) / 4;
      const cells: [string, number, string][] = [["PLAYED", r.played, "#fff"], ["WON", r.won, "#4ade80"], ["DRAWN", r.drawn, "#facc15"], ["LOST", r.lost, "#f87171"]];
      head.push(<g key="rec">{cells.map(([label, n, colour], i) => {
        const x = REPORT_MARGIN + i * (box + gap);
        return <g key={label} data-record={label}>
          <rect x={x} y={y} width={box} height={150} rx={22} fill="rgb(255 255 255 / 0.06)" stroke="rgb(255 255 255 / 0.12)" />
          <text x={x + box / 2} y={y + 82} textAnchor="middle" fill={colour} fontSize={64} fontWeight={800}>{n}</text>
          <text x={x + box / 2} y={y + 124} textAnchor="middle" fill="#94a3b8" fontSize={24} fontWeight={700} letterSpacing={3}>{label}</text>
        </g>;
      })}</g>);
      y += 150;
      if (r.unscored) { head.push(<text key="unscored" x={REPORT_MARGIN} y={y + 40} fill="#94a3b8" fontSize={24}>{r.unscored} {r.unscored === 1 ? "game has" : "games have"} no score yet</text>); y += 40; }
    }
  }
  let possession = null;
  if (report.possession) {
    const top = y;
    const bar = (W - REPORT_MARGIN * 2);
    possession = <g>
      <text x={REPORT_MARGIN} y={top + 30} fill={OURS} fontSize={34} fontWeight={700}>{report.possession.ours}%</text>
      <text x={mid} y={top + 30} textAnchor="middle" fill="#94a3b8" fontSize={26}>POSSESSION</text>
      <text x={W - REPORT_MARGIN} y={top + 30} textAnchor="end" fill={THEIRS} fontSize={34} fontWeight={700}>{report.possession.theirs}%</text>
      <rect x={REPORT_MARGIN} y={top + 50} width={bar * report.possession.ours / 100} height={22} rx={11} fill={OURS} />
      <rect x={REPORT_MARGIN + bar * report.possession.ours / 100} y={top + 50} width={bar * report.possession.theirs / 100} height={22} rx={11} fill={THEIRS} />
    </g>;
    y += 140;
  } else y += 40;
  const rows = layoutRows(report.lines, y);
  y = rows.length ? rows[rows.length - 1].bottom : y;
  // Owner request 2026-11-15: the games won, drawn and lost, listed under the totals.
  const listed = (["won", "drawn", "lost"] as const).filter((k) => report.results?.[k].length);
  const resultRows = layoutRows(listed.map((k) => ({ label: `${k[0].toUpperCase()}${k.slice(1)} (${report.results![k].length})`,
    value: report.results![k].join(", ") })), y + 20);
  y = resultRows.length ? resultRows[resultRows.length - 1].bottom : y;
  // Spec 270 (owner request 2026-11-16): the season's top three confirmed scorers.
  let scorers = null;
  if (report.scorers) {
    const top = y + 30;
    const srows = layoutRows(report.scorers.lines, top + 70);
    let end = srows.length ? srows[srows.length - 1].bottom : top + 40;
    scorers = <g data-section="scorers"><text x={REPORT_MARGIN} y={top} fill="#4ade80" fontSize={30} fontWeight={700} letterSpacing={4}>TOP SCORERS</text><Rows rows={srows} />
      {report.scorers.note && <text x={REPORT_MARGIN} y={end + 10} fill="#94a3b8" fontSize={24}>{report.scorers.note}</text>}</g>;
    if (report.scorers.note) end += 40;
    y = end;
  }
  let player = null;
  if (report.player) {
    const top = y + 30;
    const prow = layoutRows(report.player.lines, top + 70);
    player = <g><text x={REPORT_MARGIN} y={top} fill="#facc15" fontSize={30} fontWeight={700} letterSpacing={4}>{report.player.name.toUpperCase()}</text><Rows rows={prow} /></g>;
    y = prow.length ? prow[prow.length - 1].bottom : top + 70;
  }
  const H = Math.max(1350, y + 100);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} fontFamily={FONT} role="img" aria-label={`${report.title}, ${report.subtitle}`} className="h-auto w-full max-w-[540px] rounded-2xl shadow-2xl">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b1220" /><stop offset="1" stopColor="#1e1b4b" /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#bg)" />
      {head}
      {possession}
      <Rows rows={rows} />
      {resultRows.map((row, i) => <g key={listed[i]} data-results={listed[i]}><Rows rows={[row]} /></g>)}
      {scorers}
      {player}
      <text x={REPORT_MARGIN} y={H - 60} fill="#64748b" fontSize={26}>Football Memories · from the coaches' tags</text>
    </svg>
  );
}

async function savePng(svg: SVGSVGElement, name: string) {
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error("The report could not be drawn")); img.src = url; });
    const width = svg.viewBox.baseVal.width || W, height = svg.viewBox.baseVal.height || 1350;
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
    const png = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
    if (!png) throw new Error("The report could not be saved");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(png), download: `${name}.png` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** /report/match/:id and /report/season (the Library's age group and season). */
export function ReportPage({ kind }: { kind: "match" | "season" }) {
  const id = useParams().id;
  // Owner request 2026-11-15: with Hudl hidden and Veo shown, reports use the Veo
  // matches (Veo's own score) and the Veo team name, as the Library does.
  const veoOnly = !connectionShown("hudl") && connectionShown("veo");
  const hudl = useHudlLibrary();
  const veoLibrary = useVeoLibrary();
  const library = veoOnly ? { ...veoLibrary, data: veoLibrary.data?.map(veoAsHudl) } : hudl;
  const corrections = useScoreCorrections();
  const goalEntries = useGoalEntries();
  const hudlClub = useHomeClub();
  const veoTeam = useVeoTeam();
  const { name } = usePrimaryPlayerName();
  // Owner report 2026-11-13: a season report is one team in one season, never every
  // age group mixed; the team is the one chosen on Opponents (it moves up each season).
  const [team, setTeam] = useTeamChoice(library.data);
  const [season, setSeason] = useState("");
  // Veo matches seldom name an age group, so a Veo season report is chosen by season only.
  const veoSeasons = [...new Set((library.data ?? []).map((m) => m.season_label || "Unclassified"))].sort().reverse();
  const seasonsOfTeam = veoOnly ? veoSeasons.map((x) => ({ season: x, age: "Veo" })) : team === null ? [] : teamSeasons(library.data, team);
  const shownSeason = seasonsOfTeam.some((x) => x.season === season) ? season : seasonsOfTeam[0]?.season ?? "";
  // Owner request 2026-11-15: one Veo account films more than one club, so a Veo
  // season report is one club in one season (the Veo team first, else the most filmed).
  const [veoClub, setVeoClub] = useState("");
  const known = veoClubNames(veoLibrary.data ?? [], veoTeam);
  const clubOfId = new Map((veoLibrary.data ?? []).map((m) => [m.id, veoClubOf(m, known)]));
  const counts = new Map<string, number>();
  for (const m of library.data ?? []) if ((m.season_label || "Unclassified") === shownSeason) { const c = clubOfId.get(m.id) ?? "Other"; counts.set(c, (counts.get(c) ?? 0) + 1); }
  const veoClubs = [...counts.keys()].sort((a, b) => (counts.get(b)! - counts.get(a)!) || a.localeCompare(b));
  const shownClub = counts.has(veoClub) ? veoClub : veoTeam && counts.has(veoTeam) ? veoTeam : veoClubs[0] ?? "";
  const matchClub = kind === "match" && id ? clubOfId.get(id) : undefined;
  const club = !veoOnly ? hudlClub
    : kind === "season" ? shownClub || veoTeam || hudlClub
    : matchClub && matchClub !== "Other" ? matchClub : veoTeam || hudlClub;
  const card = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const shownMatch = kind === "match" ? library.data?.find((m) => m.id === id) : undefined;
  const ours = useCrest(club);
  const theirs = useCrest(shownMatch ? fixtureParts(shownMatch.title, club)?.opponent ?? null : null);
  if (library.isPending) return <Spinner label="Loading matches" />;
  const match = kind === "match" ? library.data?.find((m) => m.id === id) : undefined;
  if (kind === "match" && !match) return <div className="panel p-6"><Link to="/">← Library</Link><p className="mt-4">This match is not cached.</p></div>;
  const scope = veoOnly ? (library.data ?? []).filter((m) => (m.season_label || "Unclassified") === shownSeason && (clubOfId.get(m.id) ?? "Other") === shownClub)
    : team === null ? library.data ?? [] : (library.data ?? []).filter((m) => inCohort(m, team) && m.season_label === shownSeason);
  const veoRows = match && veoOnly ? teamSplit(veoLibrary.data?.find((m) => m.id === match.id)?.team_data) : undefined;
  // Spec 270: each match's goals and keepers (a Veo match counts Veo's own goal events).
  const veoById = new Map((veoLibrary.data ?? []).map((m) => [m.id, m]));
  const goalsOf = (m: (typeof scope)[number]): MatchGoals => matchGoals(m.source === "veo" ? veoById.get(m.id) ?? m : m, club, goalEntries.data?.[m.id]);
  const report = match ? matchReport(match, club, corrections.data, name, veoRows, goalsOf(match))
    : seasonReport(scope, veoOnly ? `Veo · ${shownSeason}` : team === null ? "All matches" : `${ageIn(team, shownSeason)} · ${shownSeason}`, club, corrections.data, name,
      Object.fromEntries(scope.map((m) => [m.id, goalsOf(m)])));
  const ageOptions = team === null ? [] : [...new Set([...agesIn(library.data, shownSeason), ageIn(team, shownSeason)])].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  const file = `${report.title} ${report.subtitle}`.replace(/[^\w -]+/g, "").trim() || "report";
  return (
    <div className="report-page space-y-5">
      <header className="no-print flex flex-wrap items-end gap-3">
        <div className="mr-auto"><Link to={match ? matchLink(match) : "/"} className="text-sm text-fg-muted">← Back</Link>
          <h1 className="mt-3 text-2xl font-semibold">Share a {kind} report</h1>
          <p className="text-sm text-fg-muted">Save it as an image for family, or print it to PDF.</p>
          {kind === "season" && veoOnly && <div className="mt-3 flex flex-wrap gap-3">
            <label className="text-xs text-fg-muted">Season<select className="field mt-1 w-auto" aria-label="Season" value={shownSeason} onChange={(e) => setSeason(e.target.value)}>
              {veoSeasons.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            <label className="text-xs text-fg-muted">Club<select className="field mt-1 w-auto" aria-label="Club" value={shownClub} onChange={(e) => setVeoClub(e.target.value)}>
              {veoClubs.map((x) => <option key={x} value={x}>{x} ({counts.get(x)})</option>)}</select></label>
          </div>}
          {kind === "season" && !veoOnly && team !== null && <div className="mt-3 flex flex-wrap gap-3">
            <label className="text-xs text-fg-muted">Age group<select className="field mt-1 w-auto" aria-label="Age group" value={ageIn(team, shownSeason)}
              onChange={(e) => { const t = cohortOf(e.target.value, shownSeason); if (t !== null) { setTeam(t); setSeason(shownSeason); } }}>
              {ageOptions.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="text-xs text-fg-muted">Season<select className="field mt-1 w-auto" aria-label="Season" value={shownSeason} onChange={(e) => setSeason(e.target.value)}>
              {seasonsOfTeam.map((x) => <option key={x.season} value={x.season}>{x.season} ({x.age})</option>)}</select></label>
          </div>}</div>
        <Button variant="primary" onClick={() => { setError(""); const svg = card.current?.querySelector("svg"); if (svg) savePng(svg, file).catch((e: Error) => setError(e.message)); }}><Download size={16} /> Save image</Button>
        <Button onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</Button>
      </header>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div ref={card} className="report-card flex justify-center"><ReportCard report={report} crests={{ ours: ours.data?.url, theirs: theirs.data?.url, square: { ours: ours.data?.square, theirs: theirs.data?.square } }} /></div>
    </div>
  );
}
