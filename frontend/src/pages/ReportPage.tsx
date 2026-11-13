import { Download, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { hudlAgeGroups, useHudlLibrary } from "../api/hudl";
import { OURS, THEIRS } from "../lib/teamColours";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/Spinner";
import { useArchiveFilters } from "../lib/archiveFilters";
import { useScoreCorrections } from "../lib/matchScore";
import { type Report, matchReport, seasonReport } from "../lib/report";
import { useHomeClub } from "../lib/useHomeClub";
import { usePrimaryPlayerName } from "../lib/usePrimaryPlayerName";

const W = 1080, H = 1350;
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

/** The report as one self-contained SVG (no external images), so it can become a PNG. */
export function ReportCard({ report }: { report: Report }) {
  let y = 470;
  const row = (label: string, value: string, key: string) => {
    const at = y; y += 62;
    return <g key={key}><text x={90} y={at} fill="#cbd5e1" fontSize={34}>{label}</text><text x={W - 90} y={at} textAnchor="end" fill="#fff" fontSize={36} fontWeight={700}>{value}</text>
      <line x1={90} x2={W - 90} y1={at + 22} y2={at + 22} stroke="#ffffff22" /></g>;
  };
  const lines = report.lines.map((l, i) => row(l.label, l.value, `l${i}`));
  let playerBlock = null;
  if (report.player) {
    y += 40; const head = y; y += 70;
    playerBlock = <g><text x={90} y={head} fill="#facc15" fontSize={30} fontWeight={700} letterSpacing={4}>{report.player.name.toUpperCase()}</text>
      {report.player.lines.map((l, i) => row(l.label, l.value, `p${i}`))}</g>;
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} fontFamily={FONT} role="img" aria-label={`${report.title}, ${report.subtitle}`} className="h-auto w-full max-w-[540px] rounded-2xl shadow-2xl">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b1220" /><stop offset="1" stopColor="#1e1b4b" /></linearGradient></defs>
      <rect width={W} height={H} fill="url(#bg)" />
      <text x={90} y={130} fill="#22d3ee" fontSize={28} fontWeight={700} letterSpacing={6}>{report.eyebrow}</text>
      <text x={90} y={210} fill="#fff" fontSize={60} fontWeight={800}>{report.title.length > 30 ? `${report.title.slice(0, 29)}…` : report.title}</text>
      <text x={90} y={260} fill="#94a3b8" fontSize={32}>{report.subtitle}</text>
      {report.headline && <text x={W - 90} y={210} textAnchor="end" fill="#fff" fontSize={72} fontWeight={800}>{report.headline}</text>}
      {report.possession && <g>
        <text x={90} y={340} fill={OURS} fontSize={34} fontWeight={700}>{report.possession.ours}%</text>
        <text x={W / 2} y={340} textAnchor="middle" fill="#94a3b8" fontSize={26}>POSSESSION</text>
        <text x={W - 90} y={340} textAnchor="end" fill={THEIRS} fontSize={34} fontWeight={700}>{report.possession.theirs}%</text>
        <rect x={90} y={365} width={(W - 180) * report.possession.ours / 100} height={22} rx={11} fill={OURS} />
        <rect x={90 + (W - 180) * report.possession.ours / 100} y={365} width={(W - 180) * report.possession.theirs / 100} height={22} rx={11} fill={THEIRS} />
      </g>}
      {lines}
      {playerBlock}
      <text x={90} y={H - 70} fill="#64748b" fontSize={26}>Football Memories · from the coaches' tags</text>
    </svg>
  );
}

async function savePng(svg: SVGSVGElement, name: string) {
  const data = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error("The report could not be drawn")); img.src = url; });
    const canvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
    canvas.getContext("2d")!.drawImage(img, 0, 0, W, H);
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
  const { age, season } = useArchiveFilters();
  const card = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  if (library.isPending) return <Spinner label="Loading matches" />;
  const match = kind === "match" ? library.data?.find((m) => m.id === id) : undefined;
  if (kind === "match" && !match) return <div className="panel p-6"><Link to="/">← Library</Link><p className="mt-4">This match is not cached.</p></div>;
  const scope = (library.data ?? []).filter((m) => (!age || hudlAgeGroups(m).includes(age)) && (!season || (m.season_label || "Unclassified") === season));
  const report = match ? matchReport(match, club, corrections.data, name)
    : seasonReport(scope, `${age || "All ages"} · ${season || "All seasons"}`, club, corrections.data, name);
  const file = `${report.title} ${report.subtitle}`.replace(/[^\w -]+/g, "").trim() || "report";
  return (
    <div className="report-page space-y-5">
      <header className="no-print flex flex-wrap items-end gap-3">
        <div className="mr-auto"><Link to={match ? `/hudl/${encodeURIComponent(match.id)}` : "/"} className="text-sm text-fg-muted">← Back</Link>
          <h1 className="mt-3 text-2xl font-semibold">Share a {kind} report</h1>
          <p className="text-sm text-fg-muted">{kind === "season" ? "Uses the age group and season chosen in the Library. " : ""}Save it as an image for family, or print it to PDF.</p></div>
        <Button variant="primary" onClick={() => { setError(""); const svg = card.current?.querySelector("svg"); if (svg) savePng(svg, file).catch((e: Error) => setError(e.message)); }}><Download size={16} /> Save image</Button>
        <Button onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</Button>
      </header>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div ref={card} className="report-card flex justify-center"><ReportCard report={report} /></div>
    </div>
  );
}
