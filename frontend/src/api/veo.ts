import type { VeoTeamData } from "../lib/veoTeamSplit";
import { useQuery } from "@tanstack/react-query";
import { HUDL } from "./hudl";
import { helperFetch, localiseHelperUrls } from "./helperBase";
import { useHelperEnabled } from "./hostedPermissions";

/** Spec 250: the desktop helper's Veo routes (same helper and origin rules as Hudl). */
export type VeoSummary = { clubs: number; matches: number; with_video: number; expired: number; expiring: number; moments?: number };
export type VeoStatus = {
  configured: boolean; shared?: number; busy: boolean; state: string; message: string; secret_store?: string;
  summary: VeoSummary | null; progress?: { done: number; total: number; fraction: number } | null; library_checked_at?: number | null;
  match_id?: string | null; stream_url?: string | null; filename?: string | null; download_url?: string | null;
};

export async function veoRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await helperFetch(`${HUDL}/veo${path}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  // Opened over the network the page reaches the helper through /helper, so the
  // helper's own 127.0.0.1:8766 stream and poster links must point there too.
  const data = localiseHelperUrls(await response.json().catch(() => ({ detail: "The desktop helper is not running." })), HUDL);
  if (!response.ok) throw new Error(data.detail || "Veo request failed.");
  return data as T;
}

/** Owner request 2026-11-20: a saved shared (public) Veo match link; title once read. */
export type VeoSharedLink = { slug: string; url: string; title: string | null };

/** Spec 260: one Veo match from the helper's cache (no remote media URL is ever in it). */
export type VeoHighlight = { id: string; category: string; time_s: number; duration_s: number; ai?: boolean; note?: string;
  team?: boolean; side?: "own" | "opponent" }; // team: one of Veo's team events (owner request 2026-11-15)
export type VeoMatch = {
  id: string; source: "veo"; title: string; team?: string | null; age_group: string; age_groups?: string[]; season_label?: string;
  duration_s?: number; available: boolean; expiration_status?: string | null; home_or_away?: string | null;
  score?: { ours: number; theirs: number } | null; halves?: number[][]; moments?: VeoHighlight[]; poster_url?: string | null;
  team_data?: VeoTeamData | null; // decision 009: Veo's team-sided stats and events
  team_moments?: VeoHighlight[]; // owner request 2026-11-15: team events as moments, from the helper
};
export function useVeoLibrary() {
  return useQuery<VeoMatch[]>({enabled:useHelperEnabled('veo'), queryKey: ["veo-library"], queryFn: () => veoRequest("/library"), retry: false, refetchInterval: 30000 });
}
export function veoAgeGroups(match: VeoMatch): string[] {
  return match.age_groups?.length ? match.age_groups : [match.age_group || "Unclassified"];
}
/** Owner request 2026-11-26: expired Veo matches are left out of the library. */
export function veoExpired(match: VeoMatch): boolean {
  return !match.available || match.expiration_status === "expired";
}
export function veoExpiry(match: VeoMatch): string | null {
  if (veoExpired(match)) return "Video expired on Veo";
  return match.expiration_status === "expires-soon" ? "Video expires soon on Veo" : null;
}
export function useVeoStatus() {
  return useQuery<VeoStatus>({enabled:useHelperEnabled('veo'), queryKey: ["veo-account"], queryFn: () => veoRequest("/account"), retry: false,
    refetchInterval: (query) => (query.state.data?.busy ? 1500 : false) });
}
