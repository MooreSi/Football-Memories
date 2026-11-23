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
    onMutate: () => client.cancelQueries({queryKey: ["automatic-tournaments"]}),
    mutationFn: (body: {name: string; team: string; match_keys: string[]}) => request("", {method: "PUT", body: JSON.stringify(body)}),
    onSuccess: data => {
      client.setQueryData(["tournaments"], data);
      void client.invalidateQueries({queryKey: ["automatic-tournaments"]});
    },
  });
}
export function useRemoveTournamentGame() {
  const client = useQueryClient();
  return useMutation({
    onMutate: () => client.cancelQueries({queryKey: ["automatic-tournaments"]}),
    mutationFn: ({id, key}: {id: string; key: string}) => request(`/${encodeURIComponent(id)}/matches/${encodeURIComponent(key)}`, {method: "DELETE"}),
    onSuccess: data => {
      client.setQueryData(["tournaments"], data);
      void client.invalidateQueries({queryKey: ["automatic-tournaments"]});
    },
  });
}

export type TournamentDetectionMatch = {key: string; title: string; club: string; age_group: string; players: string[]};
export const detectTournaments = (matches: TournamentDetectionMatch[], signal?: AbortSignal) => request("/detect", {method: "POST", body: JSON.stringify({matches}), signal});
export function useRenameTournament() {
  const client = useQueryClient();
  return useMutation({
    onMutate: () => client.cancelQueries({queryKey: ["automatic-tournaments"]}),
    mutationFn: ({id, name}: {id: string; name: string}) => request(`/${encodeURIComponent(id)}`, {method: "PATCH", body: JSON.stringify({name})}),
    onSuccess: data => {
      client.setQueryData(["tournaments"], data);
      void client.invalidateQueries({queryKey: ["automatic-tournaments"]});
    },
  });
}
