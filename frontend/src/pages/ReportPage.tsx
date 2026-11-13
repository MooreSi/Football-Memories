import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useHudlLibrary } from "../api/hudl";
import { OURS, THEIRS } from "../lib/teamColours";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useTeamChoice } from "../lib/useTeamChoice";
import { ageIn, agesIn, cohortOf, inCohort, teamSeasons } from "../lib/teams";
import { useScoreCorrections } from "../lib/matchScore";
import { type Report, matchReport, seasonReport } from "../lib/report";
import { useHomeClub } from "../lib/useHomeClub";
import { fixtureParts } from "../lib/hudlFixture";
import { initials } from "../components/TeamBadge";
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
      return await new Promise<string | null>((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ok(null); r.readAsDataURL(blob); });
    },
  });
}

function Crest({ cx, cy, r, name, src, tone }: { cx: number; cy: number; r: number; name: string; src?: string | null; tone: "home" | "away" }) {
  const inset = r * 0.68;
  return <g data-crest={src ? "image" : "initials"}>
    <circle cx={cx} cy={cy} r={r} fill={src ? "#f1f4f9" : tone === "home" ? "#22d3ee" : "#cbd5e1"} stroke="#ffffff33" strokeWidth={4} />
    {src ? <image href={src} x={cx - inset} y={cy - inset} width={inset * 2} height={inset * 2} preserveAspectRatio="xMidYMid meet" />
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
export function ReportCard({ report, crests = {} }: { report: Report; crests?: { ours?: string | null; theirs?: string | null } }) {
  const match = report.kind === "match";
  const mid = W / 2;
  let y: number;
  const head: React.ReactNode[] = [];
  if (match) {
    head.push(<text key="e" x={mid} y={110} textAnchor="middle" fill="#22d3ee" fontSize={28} fontWeight={700} letterSpacing={6}>{report.eyebrow}</text>);
    head.push(<Crest key="c1" cx={230} cy={260} r={95} name={report.ours} src={crests.ours} tone="home" />);
    head.push(<Crest key="c2" cx={W - 230} cy={260} r={95} name={report.theirs} src={crests.theirs} tone="away" />);
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
    head.push(<Crest key="c1" cx={REPORT_MARGIN + 75} cy={235} r={75} name={report.ours} src={crests.ours} tone="home" />);
    const size = fitTitle(report.title, 60, 28, W - REPORT_MARGIN * 2 - 190);
    head.push(<text key="t" x={REPORT_MARGIN + 180} y={225} fill="#fff" fontSize={size} fontWeight={800}>{report.title}</text>);
    head.push(<text key="s" x={REPORT_MARGIN + 180} y={275} fill="#94a3b8" fontSize={30}>{report.subtitle}</text>);
    if (report.headline) head.push(<text key="h" x={REPORT_MARGIN} y={390} fill="#fff" fontSize={56} fontWeight={800}>{report.headline}</text>);
    y = report.headline ? 440 : 360;
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
  const library = useHudlLibrary();
  const corrections = useScoreCorrections();
  const club = useHomeClub();
  const { name } = usePrimaryPlayerName();
  // Owner report 2026-11-13: a season report is one team in one season, never every
  // age group mixed; the team is the one chosen on Opponents (it moves up each season).
  const [team, setTeam] = useTeamChoice(library.data);
  const [season, setSeason] = useState("");
  const seasonsOfTeam = team === null ? [] : teamSeasons(library.data, team);
  const shownSeason = seasonsOfTeam.some((x) => x.season === season) ? season : seasonsOfTeam[0]?.season ?? "";
  const card = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const shownMatch = kind === "match" ? library.data?.find((m) => m.id === id) : undefined;
  const ours = useCrest(club);
  const theirs = useCrest(shownMatch ? fixtureParts(shownMatch.title, club)?.opponent ?? null : null);
  if (library.isPending) return <Spinner label="Loading matches" />;
  const match = kind === "match" ? library.data?.find((m) => m.id === id) : undefined;
  if (kind === "match" && !match) return <div className="panel p-6"><Link to="/">← Library</Link><p className="mt-4">This match is not cached.</p></div>;
  const scope = team === null ? library.data ?? [] : (library.data ?? []).filter((m) => inCohort(m, team) && m.season_label === shownSeason);
  const report = match ? matchReport(match, club, corrections.data, name)
    : seasonReport(scope, team === null ? "All matches" : `${ageIn(team, shownSeason)} · ${shownSeason}`, club, corrections.data, name);
  const ageOptions = team === null ? [] : [...new Set([...agesIn(library.data, shownSeason), ageIn(team, shownSeason)])].sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  const file = `${report.title} ${report.subtitle}`.replace(/[^\w -]+/g, "").trim() || "report";
  return (
    <div className="report-page space-y-5">
      <header className="no-print flex flex-wrap items-end gap-3">
        <div className="mr-auto"><Link to={match ? `/hudl/${encodeURIComponent(match.id)}` : "/"} className="text-sm text-fg-muted">← Back</Link>
          <h1 className="mt-3 text-2xl font-semibold">Share a {kind} report</h1>
          <p className="text-sm text-fg-muted">Save it as an image for family, or print it to PDF.</p>
          {kind === "season" && team !== null && <div className="mt-3 flex flex-wrap gap-3">
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
      <div ref={card} className="report-card flex justify-center"><ReportCard report={report} crests={{ ours: ours.data, theirs: theirs.data }} /></div>
    </div>
  );
}
