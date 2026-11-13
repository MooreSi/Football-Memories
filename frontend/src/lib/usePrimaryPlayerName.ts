import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

/** The primary player's display name (the code their Hudl tags use), or null. */
export function usePrimaryPlayerName(): { name: string | null; ready: boolean } {
  const prefs = useQuery({ queryKey: ["preferences"], queryFn: api.preferences, retry: false });
  const id = prefs.data?.primary_player_id ?? null;
  const player = useQuery({ queryKey: ["player", id], queryFn: () => api.player(id!), enabled: id !== null, retry: false });
  const ready = prefs.isSuccess && (id === null || player.isSuccess || player.isError);
  return { name: player.data?.display_name ?? null, ready };
}
