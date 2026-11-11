import { Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { HudlMatch } from "../../api/hudl";
import { formatClock } from "../../lib/format";
import { fixtureDate, fixtureParts } from "../../lib/hudlFixture";
import { TeamBadge } from "../TeamBadge";

/** Reference 1's right column, fed by the newest Hudl match for the selected age
 *  group. The Hudl library query refetches, so a newly uploaded match replaces it. */
/** Spec 190 follow-up (owner request 2026-11-11): the panel and its moments follow the
 *  match shown in the hero, and list every tagged moment of that game. */
export function HudlLatestPanel({ match, club, age, latest = true }: { match: HudlMatch; club: string | null; age: string; latest?: boolean }) {
  const parts = fixtureParts(match.title);
  const date = fixtureDate(match.title);
  const home = club || "Home";
  const moments = match.moments ?? [];
  // Owner request 2026-11-11: read the game from kick-off (times are video time, H:MM:SS).
  const recent = [...moments].sort((a, b) => a.time_s - b.time_s).slice(0, 8);
  const link = `/hudl/${encodeURIComponent(match.id)}`;
  return (
    <div className="space-y-5">
      <section aria-label={latest ? "Latest match" : "Selected match"} className="latest-match-panel panel p-5">
        <h2 className="text-lg font-semibold">{latest ? "Latest match" : "Selected match"}</h2>
        <p className="mt-3 text-center text-sm text-fg-muted">
          {[age || match.age_group, match.season_label !== "Unclassified" ? match.season_label : null, parts?.venue].filter(Boolean).join(" · ")}
        </p>
        {parts ? (
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-2">
              <TeamBadge name={home} size="lg" />
              <span className="text-sm font-medium">{home}</span>
            </div>
            <div>
              <p className="text-2xl font-semibold text-fg-muted">vs</p>
              {date && <p className="mt-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] text-ok">{date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>}
            </div>
            <div className="flex flex-col items-center gap-2">
              <TeamBadge name={parts.opponent} size="lg" tone="away" />
              <span className="text-sm font-medium">{parts.opponent}</span>
            </div>
          </div>
        ) : <p className="mt-4 text-center font-medium">{match.title}</p>}
        <p className="mt-4 text-center text-xs text-fg-muted">{moments.length ? `${moments.length} tagged moments` : "Tags not indexed yet"}</p>
        <Link to={link} className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-base font-semibold text-white shadow-[0_14px_34px_-12px_rgb(37_99_235/0.95)] hover:brightness-110">
          <Play size={17} aria-hidden /> Watch now
        </Link>
      </section>

      <section aria-label="Recent moments" className="panel p-5">
        <h2 className="mb-1 text-lg font-semibold">Recent moments</h2>
        <p className="mb-3 text-xs text-fg-subtle">From kick-off · {moments.length} tagged in this match</p>
        {recent.length === 0 ? (
          <p className="text-sm text-fg-muted">Moments appear here once this match's tags are indexed. Open the match or Refresh Hudl.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {recent.map((m) => (
              <li key={m.id}>
                <Link to={`${link}?moment=${encodeURIComponent(m.id)}`} className="flex items-center gap-3 rounded-lg py-2.5 hover:bg-white/5">
                  <span className="rounded-md bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-pin">{formatClock(m.time_s)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {moments.length > recent.length && (
          <Link to={link} className="mt-3 block text-center text-sm text-accent hover:underline">See all {moments.length} moments</Link>
        )}
      </section>
    </div>
  );
}
