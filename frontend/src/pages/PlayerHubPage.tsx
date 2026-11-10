import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Eye, Heart, Sparkles, Star, Trophy, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useHudlLibrary } from "../api/hudl";
import { MomentsPerMatch, TagRadar } from "../components/player/Charts";
import { MemoriesTimeline } from "../components/player/MemoriesTimeline";
import { MomentsFeed } from "../components/player/MomentsFeed";
import { PlayerCard } from "../components/player/PlayerCard";
import { ProfilePanel } from "../components/player/ProfilePanel";
import { StatTile } from "../components/library/StatTile";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";

/** Layout follows reference 03: card left, teams/numbers/teammates centre, dates column,
 *  tag radar + per-match bars below, phone-style moments feed right. */
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
  const first = p.per_match[0];
  const latest = p.per_match[p.per_match.length - 1];
  const recentMatches = [...p.per_match].reverse().slice(0, 6);

  return (
    <div className="player-profile space-y-6">
      <header className="profile-heading flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-accent uppercase">Player hub</p>
          <h1 className="text-3xl font-semibold tracking-tight">{p.display_name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {p.first_match_date ? `Archived since ${new Date(`${p.first_match_date}T00:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : "No matches yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/player/choose"><Button variant="ghost">Change player</Button></Link>
          {remote.data?.some(m=>m.moments?.some(t=>t.category===p.display_name)) && <Link to={`/player/hudl/${encodeURIComponent(p.display_name)}`}><Button variant="primary">Download player moments (highest quality)</Button></Link>}
          {first && <Link to={`/matches/${first.match_id}`}><Button variant="subtle"><CalendarClock size={15} aria-hidden /> First archived game</Button></Link>}
          {latest && <Link to={`/matches/${latest.match_id}`}><Button variant="subtle"><Trophy size={15} aria-hidden /> Latest game</Button></Link>}
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
            <PlayerCard player={p} />
            <ProfilePanel key={`${p.id}-${p.display_name}-${p.shirt_number}-${p.position}`} player={p} />
            <nav aria-label="Recent matches" className="profile-dates panel flex gap-2 overflow-x-auto p-2">
              {recentMatches.map((m) => (
                <Link key={m.match_id} to={`/matches/${m.match_id}`} title={`vs ${m.opponent}`}
                  className="tile shrink-0 px-3 py-2.5 text-center text-xs text-fg-muted hover:text-fg">
                  {new Date(`${m.match_date}T00:00:00`).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Matches" icon={Trophy} value={String(p.totals.matches)} unit="archived" />
            <StatTile label="Moments" icon={Sparkles} value={String(p.totals.moments)} unit="tagged" />
            <StatTile label="Unwatched" icon={Eye} value={String(p.totals.unwatched)} unit="new" />
            <StatTile label="Favourites" icon={Heart} value={String(p.totals.favourites)} unit="saved" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-label="Tag profile" className="panel p-5">
              <h2 className="text-lg font-semibold">Tag profile</h2>
              <p className="mb-2 text-xs text-fg-subtle">How often each kind of moment was tagged. Tagging can be incomplete.</p>
              <TagRadar categories={p.categories} />
            </section>
            <section aria-label="Moments per match" className="panel p-5">
              <h2 className="mb-3 text-lg font-semibold">Recent matches</h2>
              <MomentsPerMatch series={p.per_match} />
            </section>
          </div>
        </div>

        <aside className="profile-feed">
          {feed.isPending ? <Spinner label="Loading moments" /> : <MomentsFeed moments={feed.data?.items ?? []} shirt={p.shirt_number} />}
        </aside>
      </div>

      <MemoriesTimeline playerId={p.id} categories={p.categories.map((c) => c.name)} />
    </div>
  );
}
