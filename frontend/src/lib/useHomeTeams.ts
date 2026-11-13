import { useQuery } from "@tanstack/react-query";
import { api, type HomeTeams } from "../api/client";

/** Owner request 2026-11-13: the owner's team as Hudl and as Veo name it (Settings). */
export function useHomeTeams(): HomeTeams | undefined {
  return useQuery({ queryKey: ["home-teams"], queryFn: api.homeTeams, retry: false, staleTime: 60_000 }).data;
}

/** The Veo team name; there is no other guess for Veo (it is usually another club). */
export function useVeoTeam(): string | null {
  return useHomeTeams()?.veo ?? null;
}
