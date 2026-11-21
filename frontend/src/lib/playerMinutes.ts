import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { codeKey } from "./codes";
export type Minutes = Record<string, number>;
async function request(matchId: string, entry?: { player: string; minutes: number | null }): Promise<Minutes> {
  const response = await fetch(entry ? "/api/player-minutes" : `/api/player-minutes?match_id=${encodeURIComponent(matchId)}`, entry ? {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ match_id: matchId, ...entry }),
  } : undefined);
  if (!response.ok) throw new Error(entry ? "Could not save minutes. Please try again." : "Saved minutes unavailable.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 600)
    .map(([name, value]) => [codeKey(name), value])) as Minutes;
}
export function usePlayerMinutes(matchId: string, enabled = true) {
  return useQuery({ enabled, queryKey: ["player-minutes", matchId], queryFn: () => request(matchId), retry: false, staleTime: 60_000 });
}
export function useSavePlayerMinutes(matchId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (entry: { player: string; minutes: number | null }) => request(matchId, entry),
    onSuccess: data => qc.setQueryData(["player-minutes", matchId], data) });
}
