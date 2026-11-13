import { HUDL } from "./hudl";

/** Spec 250: the desktop helper's Veo routes (same helper and origin rules as Hudl). */
export type VeoSummary = { clubs: number; matches: number; with_video: number; expired: number; expiring: number; moments?: number };
export type VeoStatus = {
  configured: boolean; busy: boolean; state: string; message: string; secret_store?: string;
  summary: VeoSummary | null; progress?: { done: number; total: number; fraction: number } | null; library_checked_at?: number | null;
};

export async function veoRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${HUDL}/veo${path}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ detail: "The desktop helper is not running." }));
  if (!response.ok) throw new Error(data.detail || "Veo request failed.");
  return data as T;
}
