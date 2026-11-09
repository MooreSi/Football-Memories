import { Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { MatchSummary, RecentMoment } from "../../api/types";
import { formatClock, formatDate } from "../../lib/format";
import { TeamBadge } from "../TeamBadge";

/** Reference 1's right column ("Live Matches" + standings), with real archive data. */
export function LatestMatchPanel({ match, moments }: { match: MatchSummary | undefined; moments: RecentMoment[] }) {
  return (
    <div className="space-y-5">
      {match && (
        <section aria-label="Latest match" className="panel p-5">
          <h2 className="text-lg font-semibold">Latest match</h2>
          <p className="mt-3 text-center text-sm text-fg-muted">
            {[match.competition, match.season_label].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
            <div className="flex flex-col items-center gap-2">
              <TeamBadge name={match.team_name} size="lg" />
              <span className="text-sm font-medium">{match.team_name}</span>
            </div>
            <div>
              <p className="text-2xl font-semibold text-fg-muted">vs</p>
              <p className="mt-1 rounded-full bg-ok/15 px-2 py-0.5 text-[11px] text-ok">{formatDate(match.match_date)}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <TeamBadge name={match.opponent} size="lg" tone="away" />
              <span className="text-sm font-medium">{match.opponent}</span>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-fg-muted">{match.event_count} tagged moments</p>
          <Link
            to={`/matches/${match.id}`}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] text-base font-semibold text-white shadow-[0_14px_34px_-12px_rgb(37_99_235/0.95)] hover:brightness-110"
          >
            <Play size={17} aria-hidden /> Watch now
          </Link>
        </section>
      )}

      <section aria-label="Recent moments" className="panel p-5">
        <h2 className="mb-3 text-lg font-semibold">Recent moments</h2>
        {moments.length === 0 ? (
          <p className="text-sm text-fg-muted">Tagged moments appear here after you import a match with a tags file.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {moments.map((r) => (
              <li key={r.event_id}>
                <Link
                  to={`/matches/${r.match_id}?moment=${r.event_id}`}
                  className="flex items-center gap-3 rounded-lg py-2.5 hover:bg-white/5"
                >
                  <span className="rounded-md bg-ink-950 px-1.5 py-0.5 font-mono text-[11px] text-pin">{formatClock(r.time_s)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.category}</span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {r.players.length ? `${r.players.join(", ")} · ` : ""}vs {r.opponent}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
