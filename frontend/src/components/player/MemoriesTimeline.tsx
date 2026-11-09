import { useQuery } from "@tanstack/react-query";
import { Heart, Images } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { formatClock, formatDate } from "../../lib/format";
import { groupTimeline } from "../../lib/player";
import { Spinner } from "../ui/Spinner";

type View = "all" | "favourites" | "unwatched";

/** Brief section 12: the player's journey, season > month > match > moment. */
export function MemoriesTimeline({ playerId, categories }: { playerId: number; categories: string[] }) {
  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState("");
  const q = useQuery({
    queryKey: ["player", playerId, "timeline", view, category],
    queryFn: () => api.playerMoments(playerId, {
      category: category || undefined, favourites: view === "favourites", unwatched: view === "unwatched",
    }),
  });
  const seasons = useMemo(() => groupTimeline(q.data?.items ?? []), [q.data]);

  return (
    <section aria-label="Memories timeline" className="panel p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h2 className="text-xl font-semibold">Memories timeline</h2>
          <p className="text-sm text-fg-muted">Every tagged moment, season by season.</p>
        </div>
        <div role="tablist" aria-label="Timeline view" className="inline-flex rounded-full border border-line bg-ink-900 p-1 text-sm">
          {(["all", "favourites", "unwatched"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`rounded-full px-3.5 py-1.5 capitalize ${view === v ? "bg-gradient-to-r from-[#2563eb] to-accent-strong text-white" : "text-fg-muted hover:text-fg"}`}>
              {v === "all" ? "All moments" : v}
            </button>
          ))}
        </div>
        <label>
          <span className="sr-only">Event type</span>
          <select className="field w-auto rounded-full" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All event types</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      {q.isPending ? (
        <Spinner label="Loading memories" />
      ) : seasons.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-muted">
          {view === "favourites" ? "No favourites yet. Tap the heart on a moment to keep it here." : view === "unwatched" ? "You have watched every moment." : "No moments yet."}
        </p>
      ) : (
        <ol className="space-y-10">
          {seasons.map((s) => (
            <li key={s.season}>
              <h3 className="sticky top-[76px] z-10 mb-4 inline-block rounded-full bg-ink-950/85 px-4 py-1.5 text-lg font-semibold ring-1 ring-accent/40 backdrop-blur">
                Season {s.season}
              </h3>
              <ol className="relative space-y-8 border-l border-white/10 pl-6">
                {s.months.map((mo) => (
                  <li key={mo.key}>
                    <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-accent shadow-[0_0_12px_rgb(34_211_238/0.8)]" aria-hidden />
                    <h4 className="mb-3 text-sm font-semibold tracking-wider text-fg-muted uppercase">{mo.label}</h4>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {mo.matches.map((m) => (
                        <article key={m.match_id} className="tile flex gap-3 overflow-hidden p-3">
                          <Link to={`/matches/${m.match_id}`} className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-ink-800" aria-label={`Open match vs ${m.opponent}`}>
                            {m.thumbnail_url ? <img src={m.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" /> : <Images className="m-auto mt-6 text-fg-subtle" aria-hidden />}
                          </Link>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">vs {m.opponent}</p>
                            <p className="mb-2 text-xs text-fg-subtle">
                              {formatDate(m.match_date)} · {m.team_name}{m.age_group ? ` ${m.age_group}` : ""}
                            </p>
                            <ul className="flex flex-wrap gap-1.5" aria-label={`Moments vs ${m.opponent}`}>
                              {m.moments.map((x) => (
                                <li key={x.event_id}>
                                  <Link to={`/matches/${x.match_id}?moment=${x.event_id}`}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition hover:border-accent/60 ${x.viewed ? "border-white/10 text-fg-muted" : "border-accent/40 text-fg"}`}>
                                    {x.favourite && <Heart size={10} className="fill-danger text-danger" aria-label="favourite" />}
                                    <span className="font-mono text-pin">{formatClock(x.time_s)}</span> {x.category}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
