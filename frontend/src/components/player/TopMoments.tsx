import { useMutation, useQuery } from "@tanstack/react-query";
import { Clapperboard, Film, Heart, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { HudlMatch } from "../../api/hudl";
import { formatClock } from "../../lib/format";
import { rankHudlMoments } from "../../lib/hubExtras";
import { Button } from "../ui/Button";

type Card = { key: string; reason: string; opponent: string; date: string; time_s: number; href: string; thumbnail: string | null;
  hudl?: { match_id: string; moment_id: string }; event_id?: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (date: string) => (date ? `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}` : "");

/** Owner request 2026-11-13: the player's top five moments, favourites first, then the
 *  Hudl moments that overlapped a team goal, a save, a chance or a shot faced. One
 *  click makes them a reel (Hudl moments in the Reel Studio; imported ones as a reel). */
export function TopMoments({ playerId, name, library, club = null }: { playerId: number; name: string; library: HudlMatch[] | undefined; club?: string | null }) {
  const navigate = useNavigate();
  const first = name.trim().split(/\s+/)[0] || name;
  const favourites = useQuery({ queryKey: ["player", playerId, "top-favourites"], queryFn: () => api.playerMoments(playerId, { favourites: true }) });
  const cards: Card[] = [
    ...(favourites.data?.items ?? []).slice().sort((a, b) => b.match_date.localeCompare(a.match_date)).map((m) => ({
      key: `f-${m.event_id}`, reason: "Favourite", opponent: m.opponent, date: m.match_date, time_s: m.time_s,
      href: `/matches/${m.match_id}?moment=${m.event_id}`, thumbnail: m.thumbnail_url, event_id: m.event_id })),
    ...rankHudlMoments(library, name, 5, club).map((m) => ({
      key: `h-${m.match_id}-${m.moment_id}`, reason: m.reason, opponent: m.opponent, date: m.date, time_s: m.time_s,
      href: m.href, thumbnail: m.thumbnail, hudl: { match_id: m.match_id, moment_id: m.moment_id } })),
  ].slice(0, 5);
  const reelName = `${first}'s top moments`;
  const hudl = cards.filter((c) => c.hudl);
  const imported = cards.filter((c) => c.event_id !== undefined);
  const makeImported = useMutation({
    mutationFn: () => api.createReel({ name: reelName, items: imported.map((c) => ({ event_id: c.event_id!, pre_s: null, post_s: null })) }),
    onSuccess: (reel) => navigate(`/clips/reels/${reel.id}`),
  });
  if (favourites.isPending || cards.length === 0) return null;
  function makeReel() {
    if (hudl.length === 0) { makeImported.mutate(); return; }
    const items: { match_id: string; moment_ids: string[] }[] = [];
    for (const c of hudl) {
      const group = items.find((i) => i.match_id === c.hudl!.match_id);
      if (group) group.moment_ids.push(c.hudl!.moment_id); else items.push({ match_id: c.hudl!.match_id, moment_ids: [c.hudl!.moment_id] });
    }
    navigate("/clips/reel/new", { state: { items, name: reelName } });
  }
  return <section aria-label="Top 5 moments" className="panel space-y-4 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold">Top 5 moments</h2>
        <p className="text-xs text-fg-subtle">Favourites first, then moments in a team goal, a save or a chance.</p></div>
      <Button variant="primary" disabled={makeImported.isPending} onClick={makeReel}><Clapperboard size={15} aria-hidden /> Make a reel</Button>
    </div>
    {hudl.length > 0 && imported.length > 0 && <p className="text-xs text-fg-subtle">The reel uses the Hudl moments; add imported favourites in Highlight reels.</p>}
    {makeImported.isError && <p role="alert" className="text-sm text-danger">{(makeImported.error as Error).message}</p>}
    <ol aria-label="Top moments" className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {cards.map((c, i) => <li key={c.key} className="tile w-56 shrink-0 overflow-hidden">
        <div className="relative aspect-video bg-ink-800">
          {c.thumbnail ? <img crossOrigin="anonymous" src={c.thumbnail} alt="" className="size-full object-cover" /> : <Film className="m-auto mt-8 text-fg-subtle" aria-hidden />}
          <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-linear-to-br from-[#2563eb] to-[#38bdf8] text-xs font-bold text-white">{i + 1}</span>
          <span className="absolute right-2 bottom-2 rounded-md bg-ink-950/85 px-1.5 py-0.5 font-mono text-[11px] text-pin">{formatClock(c.time_s)}</span>
        </div>
        <div className="space-y-1 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">{c.reason === "Favourite" && <Heart size={12} className="fill-danger text-danger" aria-hidden />}{c.reason}</p>
          <p className="truncate text-sm font-semibold">vs {c.opponent}</p>
          <div className="flex items-center justify-between gap-2 text-xs text-fg-muted"><span>{day(c.date)}</span>
            <Link to={c.href} aria-label={`Play ${c.reason.toLowerCase()} vs ${c.opponent}`} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"><Play size={12} aria-hidden />Play</Link></div>
        </div>
      </li>)}
    </ol>
  </section>;
}
