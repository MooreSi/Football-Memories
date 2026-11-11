import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Eye, Heart, Sparkles, Star, Trophy, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useHudlLibrary } from "../api/hudl";
import { HudlMomentsList } from "../components/player/HudlMomentsList";
import { hudlPerMatch, hudlPlayerMatches } from "../lib/hudlPlayer";
import { watchedHudlMoments } from "../lib/hudlWatched";
import { MomentsPerMatch } from "../components/player/Charts";
import { MemoriesTimeline } from "../components/player/MemoriesTimeline";
import { MomentsFeed } from "../components/player/MomentsFeed";
import { PlayerCard } from "../components/player/PlayerCard";
import { ProfilePanel } from "../components/player/ProfilePanel";
import { StatTile } from "../components/library/StatTile";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";

/** Layout follows reference 03: card left, teams/numbers/teammates centre, dates column,
 *  per-match bars below (the tag radar moved to the Library as the Match Profile, 2026-11-11), phone-style moments feed right. */
export function PlayerHubPage() {
  const id = Number(useParams().id);
  const remote = useHudlLibrary();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["player", id], queryFn: () => api.player(id), enabled: Number.isFinite(id) });
  const feed = useQuery({ queryKey: ["player", id, "feed"], queryFn: () => api.playerMoments(id) });
  const makePrimary = useMutation({
    mutationFn: () => {localStorage.removeItem("fm.hudl.player");return api.setPrimaryPlayer(id);},
    onSuccess: () => void qc.invalidateQueries(),
  });

  if (profile.isPending) return <Spinner label="Loading player" />;
  if (profile.isError) {
    return (
      <EmptyState icon={UserRound} title="Player not found">
        <Link to="/player/choose" className="text-accent hover:underline">Choose a player</Link>
      </EmptyState>
    );
  }
  const p = profile.data;
  // Hudl tag metadata counts alongside imported matches (owner request 2026-11-10).
  const hudl = hudlPlayerMatches(remote.data, p.display_name);
  const hudlMoments = hudl.flatMap((m) => m.moments);
  const watched = watchedHudlMoments();
  const perMatch = [...p.per_match, ...hudlPerMatch(hudl, p.display_name)]
    .filter((m) => m.match_date)
    .sort((a, b) => a.match_date.localeCompare(b.match_date));
  const href = (m: (typeof perMatch)[number]) => m.href ?? `/matches/${m.match_id}`;
  const first = perMatch[0];
  const latest = perMatch[perMatch.length - 1];
  const recentMatches = [...perMatch].reverse().slice(0, 6);
  const hudlMatches = hudl.map((m) => ({ id: m.id, title: m.title, count: m.moments.length })).reverse();
  const since = [p.first_match_date, first?.match_date].filter(Boolean).sort()[0];

  return (
    <div className="player-profile space-y-6">
      <header className="profile-heading flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-accent uppercase">Player hub</p>
          <h1 className="text-3xl font-semibold tracking-tight">{p.display_name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {since ? `Archived since ${new Date(`${since}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "No matches yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/player/choose"><Button variant="ghost">Change player</Button></Link>
          {hudlMatches.length > 0 && <Link to={`/player/hudl/${encodeURIComponent(p.display_name)}`}><Button variant="primary">Download player moments (highest quality)</Button></Link>}
          {first && <Link to={href(first)}><Button variant="subtle"><CalendarClock size={15} aria-hidden /> First archived game</Button></Link>}
          {latest && <Link to={href(latest)}><Button variant="subtle"><Trophy size={15} aria-hidden /> Latest game</Button></Link>}
          {p.is_primary ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-pin/40 bg-pin/10 px-3.5 text-sm text-pin">
              <Star size={15} className="fill-pin" aria-hidden /> Your player
            </span>
          ) : (
            <Button variant="primary" onClick={() => makePrimary.mutate()} disabled={makePrimary.isPending}>
              <Star size={15} aria-hidden /> Make this my player
            </Button>
          )}
        </div>
      </header>

      <div className="profile-workspace">
        <div className="profile-details min-w-0 space-y-6">
          <div className="profile-top">
            <PlayerCard player={p} moments={p.totals.moments + hudlMoments.length} games={p.totals.matches + hudl.length} />
            <ProfilePanel key={`${p.id}-${p.display_name}-${p.shirt_number}-${p.position}-${p.club_name}-${p.card_style}`} player={p} />
            <nav aria-label="Recent matches" className="profile-dates panel flex gap-2 overflow-x-auto p-2">
              {recentMatches.map((m) => (
                <Link key={m.match_id} to={href(m)} title={`vs ${m.opponent}`}
                  className="tile shrink-0 px-3 py-2.5 text-center text-xs text-fg-muted hover:text-fg">
                  {new Date(`${m.match_date}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Matches" icon={Trophy} value={String(p.totals.matches + hudl.length)} unit="tagged in" />
            <StatTile label="Moments" icon={Sparkles} value={String(p.totals.moments + hudlMoments.length)} unit="tagged" />
            <StatTile label="Unwatched" icon={Eye} value={String(p.totals.unwatched + hudlMoments.filter((m) => !watched.has(m.id)).length)} unit="new" />
            <StatTile label="Favourites" icon={Heart} value={String(p.totals.favourites)} unit="saved" />
          </div>

          <section aria-label="Moments per match" className="panel min-w-0 p-5">
            <h2 className="mb-3 text-lg font-semibold">Recent matches</h2>
            <MomentsPerMatch series={perMatch} />
          </section>
        </div>

        <aside className="profile-feed">
          {feed.isPending ? <Spinner label="Loading moments" /> : !feed.data?.items.length && hudlMoments.length ? (
            <HudlMomentsList matches={hudl} />
          ) : <MomentsFeed moments={feed.data?.items ?? []} shirt={p.shirt_number} />}
        </aside>
      </div>

      {hudlMatches.length > 0 && (
        <section aria-label="Tagged in Hudl matches" className="panel space-y-3 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Tagged in Hudl matches</h2>
            <span className="text-xs text-fg-subtle">{hudlMatches.length} {hudlMatches.length === 1 ? "match" : "matches"} · tag metadata only, no download needed</span>
          </div>
          <ul className="grid min-w-0 max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {hudlMatches.map((m) => (
              <li key={m.id} className="min-w-0">
                <Link to={`/hudl/${encodeURIComponent(m.id)}?player=${encodeURIComponent(p.display_name)}`} className="tile flex items-center justify-between gap-3 p-3 hover:border-accent/60">
                  <span className="min-w-0 truncate text-sm">{m.title}</span>
                  <span className="shrink-0 text-xs text-pin">{m.count} moments</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MemoriesTimeline playerId={p.id} categories={p.categories.map((c) => c.name)} hudl={hudl} />
    </div>
  );
}
