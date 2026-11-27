import { Handshake, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { HudlMatch } from "../../api/hudl";
import { journey, partnerships } from "../../lib/insights";
import { sameCode } from "../../lib/codes";
import { FILL_CLASS } from "../match/statsUi";

/** Spec 230: season-by-season moments per match, and the attacking / defending share. */
function Journey({ rows }: { rows: ReturnType<typeof journey> }) {
  const max = Math.max(1, ...rows.map((r) => r.perMatch));
  return (
    <section aria-label="Football journey" className="panel min-w-0 space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><TrendingUp size={16} className="text-accent" aria-hidden /> Football journey</h2>
      <ol className="space-y-3">
        {rows.map((r) => (
          <li key={r.season} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-sm" aria-label={`${r.season}: ${r.perMatch} moments per match over ${r.matches} matches, ${r.attackingPct}% attacking, ${r.defendingPct}% defending`}>
            <span><span className="block font-semibold">{r.season}</span><span className="text-xs text-fg-subtle">{r.age} · {r.matches} {r.matches === 1 ? "match" : "matches"}</span></span>
            <span className="space-y-1">
              <span className="flex items-center gap-2"><span className={`h-2 rounded-full ${FILL_CLASS}`} style={{ width: `${(r.perMatch / max) * 80}%` }} /><span className="text-xs tabular-nums">{r.perMatch}/match</span></span>
              <span className="block text-xs text-fg-muted">During attacks {r.attackingPct}% · during defending {r.defendingPct}%</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-fg-subtle">A moment counts when it overlaps an attacking or defending tag; it may be both, or neither.</p>
    </section>
  );
}

export function PlayerInsights({ library, name, club }: { library: HudlMatch[] | undefined; name: string; club: string | null }) {
  const tagged = (library ?? []).filter((m) => m.moments?.some((t) => sameCode(t.category, name)));
  const seasons = journey(tagged, name, club);
  const [season, setSeason] = useState("");
  const chosen = season || seasons[seasons.length - 1]?.season || "";
  if (!tagged.length) return null;
  const scope = tagged.filter((m) => !chosen || chosen === "all" || (m.season_label || "Unclassified") === chosen);
  const partners = partnerships(scope, name).slice(0, 8);
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><label className="text-xs text-fg-muted">Journey season <select className="field ml-1 w-auto" value={chosen} onChange={e => setSeason(e.target.value)}>
        <option value="all">All seasons</option>{seasons.map(s => <option key={s.season}>{s.season}</option>)}</select></label></div>
      <div className="grid gap-6 lg:grid-cols-2">
        {seasons.length > 0 && <Journey rows={seasons} />}
        <section aria-label="Best partnerships" className="panel min-w-0 space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Handshake size={16} className="text-accent" aria-hidden /> Plays alongside most</h2>
          {partners.length ? <ol className="space-y-1.5">{partners.map((p, i) => (
            <li key={p.name} className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 text-sm">
              <span className="text-xs font-semibold text-fg-muted tabular-nums">{i + 1}</span>
              <Link to={`/player/hudl/${encodeURIComponent(p.name)}`} className="truncate hover:text-accent">{p.name}</Link>
              <span className="text-xs text-fg-muted tabular-nums">{p.shared} shared moments · {p.matches} {p.matches === 1 ? "match" : "matches"}</span>
            </li>))}</ol> : <p className="text-sm text-fg-muted">No teammate is tagged in the same moments yet.</p>}
        </section>
      </div>
    </div>
  );
}
