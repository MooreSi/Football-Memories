import { useQuery } from "@tanstack/react-query";
import { HUDL } from "./hudl";
import { localiseHelperUrls } from "./helperBase";

/** Spec 250: the desktop helper's Veo routes (same helper and origin rules as Hudl). */
export type VeoSummary = { clubs: number; matches: number; with_video: number; expired: number; expiring: number; moments?: number };
export type VeoStatus = {
  configured: boolean; busy: boolean; state: string; message: string; secret_store?: string;
  summary: VeoSummary | null; progress?: { done: number; total: number; fraction: number } | null; library_checked_at?: number | null;
  match_id?: string | null; stream_url?: string | null; filename?: string | null; download_url?: string | null;
};

export async function veoRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${HUDL}/veo${path}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  // Opened over the network the page reaches the helper through /helper, so the
  // helper's own 127.0.0.1:8766 stream and poster links must point there too.
  const data = localiseHelperUrls(await response.json().catch(() => ({ detail: "The desktop helper is not running." })), HUDL);
  if (!response.ok) throw new Error(data.detail || "Veo request failed.");
  return data as T;
}

/** Spec 260: one Veo match from the helper's cache (no remote media URL is ever in it). */
export type VeoHighlight = { id: string; category: string; time_s: number; duration_s: number; ai?: boolean; note?: string };
export type VeoMatch = {
  id: string; source: "veo"; title: string; team?: string | null; age_group: string; age_groups?: string[]; season_label?: string;
  duration_s?: number; available: boolean; expiration_status?: string | null; home_or_away?: string | null;
  score?: { ours: number; theirs: number } | null; halves?: number[][]; moments?: VeoHighlight[]; poster_url?: string | null;
};
export function useVeoLibrary() {
  return useQuery<VeoMatch[]>({ queryKey: ["veo-library"], queryFn: () => veoRequest("/library"), retry: false, refetchInterval: 30000 });
}
export function veoAgeGroups(match: VeoMatch): string[] {
  return match.age_groups?.length ? match.age_groups : [match.age_group || "Unclassified"];
}
export function veoExpiry(match: VeoMatch): string | null {
  if (!match.available || match.expiration_status === "expired") return "Video expired on Veo";
  return match.expiration_status === "expires-soon" ? "Video expires soon on Veo" : null;
}
export function useVeoStatus() {
  return useQuery<VeoStatus>({ queryKey: ["veo-account"], queryFn: () => veoRequest("/account"), retry: false,
    refetchInterval: (query) => (query.state.data?.busy ? 1500 : false) });
}
