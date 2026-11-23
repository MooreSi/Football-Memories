import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Tournament } from "./types";

async function request(path = "", init?: RequestInit): Promise<Tournament[]> {
  const response = await fetch(`/api/tournaments${path}`, {...init, headers: {"Content-Type": "application/json"}});
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not save tournaments. Please retry.");
  return Array.isArray(data) ? data : [];
}
export function useTournaments() {
  return useQuery({queryKey: ["tournaments"], queryFn: () => request(), retry: false});
}
export function useSaveTournament() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: {name: string; team: string; match_keys: string[]}) => request("", {method: "PUT", body: JSON.stringify(body)}),
    onSuccess: data => client.setQueryData(["tournaments"], data),
  });
}
export function useRemoveTournamentGame() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({id, key}: {id: string; key: string}) => request(`/${encodeURIComponent(id)}/matches/${encodeURIComponent(key)}`, {method: "DELETE"}),
    onSuccess: data => client.setQueryData(["tournaments"], data),
  });
}
