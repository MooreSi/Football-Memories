import { ChevronLeft, Sparkles, Tag } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { MatchDetail } from "../../api/types";
import { formatDate } from "../../lib/format";
import type { MomentFilter } from "../../lib/useMomentFilter";
import { TeamBadge } from "../TeamBadge";

function count<T>(items: T[], key: (t: T) => string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) for (const k of key(it)) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()];
}

/** Reference 2's left rail: match card, tag categories with counts, active row highlighted. */
export function MomentsRail({ match, filter }: { match: MatchDetail; filter: MomentFilter }) {
  const categories = useMemo(
    () => count(match.events, (e) => [e.category]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [match.events],
  );
  const players = useMemo(() => count(match.events, (e) => e.players).sort((a, b) => a[0].localeCompare(b[0])), [match.events]);
  const noFilter = filter.categories.length === 0 && filter.players.length === 0;

  const row = (active: boolean) =>
    `flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium tracking-wide uppercase transition ${
      active ? "bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white" : "text-fg-muted hover:bg-white/5 hover:text-fg"
    }`;

  return (
    <aside className="panel flex min-h-0 flex-col overflow-hidden !rounded-2xl xl:sticky xl:top-[84px] xl:max-h-[calc(100vh-100px)]" aria-label="Moments">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <Link to="/" aria-label="Back to the library" className="rounded-md p-1 text-fg-muted hover:bg-white/5 hover:text-fg">
          <ChevronLeft size={18} />
        </Link>
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">Moments</h2>
      </div>

      <div className="border-b border-white/5 bg-ink-950/40 p-4 ring-1 ring-accent/30 ring-inset">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <TeamBadge name={match.team_name} />
            <span className="text-xs leading-tight">{match.team_name}</span>
          </div>
          <div className="text-[11px] text-fg-muted">
            <p>{formatDate(match.match_date)}</p>
            <p className="text-lg font-semibold text-fg">vs</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <TeamBadge name={match.opponent} tone="away" />
            <span className="text-xs leading-tight">{match.opponent}</span>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-fg-subtle">
          {[match.competition, match.season_label, match.age_group].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul aria-label="Event types">
          <li>
            <button type="button" aria-pressed={noFilter} onClick={filter.clear} className={row(noFilter)}>
              <Sparkles size={16} aria-hidden />
              <span className="flex-1">All moments</span>
              <span className="tabular-nums">{match.events.length}</span>
            </button>
          </li>
          {categories.map(([c, n]) => {
            const active = filter.categories.includes(c);
            return (
              <li key={c}>
                <button type="button" aria-pressed={active} onClick={() => filter.toggleCategory(c)} className={row(active)}>
                  <Tag size={16} aria-hidden className={active ? "" : "text-pin"} />
                  <span className="flex-1 truncate">{c}</span>
                  <span className="tabular-nums">{n}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {players.length > 0 && (
          <div className="space-y-2 border-t border-white/5 p-4">
            <p className="text-[11px] font-semibold tracking-[0.15em] text-fg-subtle uppercase">Players</p>
            <div className="flex flex-wrap gap-1.5">
              {players.map(([p, n]) => {
                const active = filter.players.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => filter.togglePlayer(p)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      active ? "border-accent/60 bg-accent/15 text-accent" : "border-line bg-ink-800 text-fg-muted hover:text-fg"
                    }`}
                  >
                    {p} {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(categories.length > 1 || players.length > 0) && (
          <div className="border-t border-white/5 p-4">
            <div role="radiogroup" aria-label="Filter logic" className="inline-flex rounded-lg border border-line bg-ink-900 p-0.5 text-xs">
              {(["or", "and"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={filter.mode === m}
                  onClick={() => filter.setMode(m)}
                  className={`rounded-md px-2.5 py-1 ${filter.mode === m ? "bg-ink-700 text-fg" : "text-fg-muted"}`}
                >
                  {m === "or" ? "Match any" : "Match all"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
