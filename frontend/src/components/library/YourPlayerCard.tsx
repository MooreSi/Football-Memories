import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { initials } from "../TeamBadge";

/** Reference 01's "MVP of the day" slot, holding the owner's primary player (brief section 20). */
export function YourPlayerCard() {
  const prefs = useQuery({ queryKey: ["preferences"], queryFn: api.preferences });
  const id = prefs.data?.primary_player_id ?? null;
  const player = useQuery({ queryKey: ["player", id], queryFn: () => api.player(id!), enabled: id != null });

  if (prefs.isPending) return null;
  if (id == null) {
    return (
      <Link to="/player/choose" className="tile flex items-center gap-3 p-4 hover:ring-1 hover:ring-accent/40">
        <span className="grid size-12 place-items-center rounded-full border border-dashed border-accent/50 text-accent"><Star size={18} /></span>
        <span>
          <span className="block text-sm font-semibold">Choose your player</span>
          <span className="block text-xs text-fg-muted">Follow one player's moments across every match</span>
        </span>
      </Link>
    );
  }
  const p = player.data;
  if (!p) return null;
  return (
    <Link
      to={`/player/${p.id}`}
      aria-label={`Your player ${p.display_name}`}
      className="relative block overflow-hidden rounded-[1.25rem] border border-white/10 bg-gradient-to-br from-[#1e3a8a]/60 via-ink-800 to-violet/30 p-4 hover:ring-1 hover:ring-accent/40"
    >
      <p className="text-sm text-fg-muted">Your player</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/90 to-[#2563eb] text-lg font-bold text-ink-950 shadow-[0_0_24px_-4px_rgb(34_211_238/0.7)]">
          {initials(p.display_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{p.display_name}</p>
          <p className="text-xs text-fg-muted">{[p.position, p.teams[0]?.team_name].filter(Boolean).join(" · ") || "Player hub"}</p>
        </div>
        <div className="rounded-xl bg-ink-950/60 px-3 py-1.5 text-center">
          <p className="text-[10px] text-fg-muted">New</p>
          <p className="text-xl font-semibold text-accent">{p.totals.unwatched}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-fg-subtle">{p.totals.moments} moments in {p.totals.matches} matches</p>
    </Link>
  );
}
