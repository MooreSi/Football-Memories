import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { clubName } from "./hudlFixture";
import { useHomeTeams } from "./useHomeTeams";

/** The owner's Hudl club: the name saved in Settings > Connections, else the primary
 *  player's "Plays for", else the newest imported team. */
export function useHomeClub(): string | null {
  const saved = useHomeTeams()?.hudl;
  const q = useQuery({
    queryKey: ["home-club"],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const { primary_player_id } = await api.preferences();
        if (primary_player_id) {
          const player = await api.player(primary_player_id);
          if (player.club_name) return player.club_name;
        }
      } catch { /* fall through to imported matches */ }
      try {
        const page = await api.matches({ page: 1, pageSize: 1 });
        return clubName(page.items[0]?.team_name);
      } catch {
        return null;
      }
    },
  });
  return saved || (q.data ?? null);
}
