import { Handshake, Route, Shield, Swords, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { HudlMatch } from "../../api/hudl";
import { fixtureDate, fixtureParts } from "../../lib/hudlFixture";
import { type Group, involvementTotals, journey, partnerships, phases } from "../../lib/insights";
import { sameCode } from "../../lib/codes";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const GROUPS: { key: Group; label: string }[] = [
  { key: "attacking", label: "Attacking" }, { key: "defending", label: "Defending" }, { key: "setPieces", label: "Set pieces" },
];

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
              <span className="flex items-center gap-2"><span className="h-2 rounded-full bg-gradient-to-r from-ok to-accent" style={{ width: `${(r.perMatch / max) * 80}%` }} /><span className="text-xs tabular-nums">{r.perMatch}/match</span></span>
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
  const v = involvementTotals(scope, name, club);
  const partners = partnerships(scope, name).slice(0, 8);
  const attacks = scope.flatMap((m) => phases(m.moments ?? [], club, name).map((p) => ({ match: m, phase: p })));
  const byMatch = [...new Map(attacks.map((a) => [a.match.id, a.match])).values()];
  return (
    <div className="space-y-6">
      <section aria-label="Involvement" className="panel space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto flex items-center gap-2 text-lg font-semibold"><Swords size={16} className="text-accent" aria-hidden /> On the pitch during</h2>
          <label className="text-xs text-fg-muted">Season <select className="field ml-1 w-auto" value={chosen} onChange={(e) => setSeason(e.target.value)}>
            <option value="all">All seasons</option>{seasons.map((s) => <option key={s.season}>{s.season}</option>)}</select></label>
        </div>
        <p className="text-sm">Tagged during <strong>{v.headline.ourChances}</strong> of our chances and <strong>{v.headline.ourGoals}</strong> {v.headline.ourGoals === 1 ? "goal" : "goals"}, and during <strong>{v.headline.theirChances}</strong> opposition {v.headline.theirChances === 1 ? "chance" : "chances"}, across {plural(v.matches, "match", "matches")}.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.key} className="tile p-3">
              <p className="flex items-center gap-1.5 text-xs text-fg-muted">{g.key === "defending" ? <Shield size={12} aria-hidden /> : <Swords size={12} aria-hidden />}{g.label}</p>
              <p className="text-2xl font-semibold tabular-nums">{v.groups[g.key]}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-fg-muted">{v.items.filter((i) => i.group === g.key).slice(0, 4).map((i) => <li key={`${i.side}${i.label}`} className="flex justify-between gap-2"><span className="truncate">{i.label}</span><span className="tabular-nums">{i.count}</span></li>)}</ul>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-fg-subtle">Counts are tags that overlap his tagged moments: he was involved or on screen during them, not necessarily the one who made them.</p>
      </section>

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

      {attacks.length > 0 && (
        <section aria-label="Attacks he was in" className="panel space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Route size={16} className="text-accent" aria-hidden /> Attacks he was in that ended in a chance</h2>
          <p className="text-sm text-fg-muted">{plural(attacks.length, "attack")} ({plural(attacks.filter((a) => a.phase.outcome === "goal").length, "goal")}) in {plural(byMatch.length, "match", "matches")}. Open a match to play them back to back, download them or make a reel.</p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{byMatch.map((m) => (
            <li key={m.id}><Link className="tile flex justify-between gap-3 p-3 text-sm hover:border-accent/60" to={`/hudl/${encodeURIComponent(m.id)}?player=${encodeURIComponent(name)}&phases=1`}>
              <span className="min-w-0 truncate">{fixtureParts(m.title, club)?.opponent ?? m.title}<span className="block text-xs text-fg-subtle">{fixtureDate(m.title)?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) ?? "Undated"}</span></span>
              <span className="shrink-0 text-xs text-pin">{plural(attacks.filter((a) => a.match.id === m.id).length, "attack")}</span></Link></li>))}</ul>
        </section>
      )}
    </div>
  );
}
