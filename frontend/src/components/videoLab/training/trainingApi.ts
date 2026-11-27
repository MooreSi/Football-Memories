import { BASE, csrfToken } from "../useLabData";

/** Spec 790: the Training tab's admin API (gateway video_analytics_ball_training). */
export const LABELS = [
  { key: "match_ball", label: "Match ball", hotkey: "1" },
  { key: "spare_ball", label: "Spare ball", hotkey: "2" },
  { key: "cone", label: "Cone or marker", hotkey: "3" },
  { key: "person", label: "Person", hotkey: "4" },
  { key: "other", label: "Something else", hotkey: "5" },
  { key: "unsure", label: "Not sure", hotkey: "0" },
] as const;
export type Choice = (typeof LABELS)[number]["key"];
export const MIN_EACH = 10;

export type BallSetSummary = { id: string; match_title: string | null; created_at: string | null; crops: number; labelled: number; revision: number };
export type BallItem = { index: number; time_s: number; box: number[]; score: number | null; image: string };
export type BallSet = { id: string; match_title: string | null; source_sha256: string; labels: string[]; items: BallItem[] };
export type BallLabels = { revision: number; source_sha256: string; items: Record<string, { label: Choice }> };
export type TrainingRequest = { id: string; kind: "ball-set" | "ball-train"; job_id?: string; match_title?: string | null; created_at?: string; state: "queued" | "running" | "complete" | "failed"; error?: string; set_id?: string; model_id?: string };
export type Evaluation = { held_out_match: string | null; crops: number; precision: number | null; recall: number | null; accuracy: number | null; note: string };
export type BallModel = { id: string; metrics: { counts: Record<string, number>; evaluation: Evaluation; created_at?: string } };
export type Training = { requests: TrainingRequest[]; models: BallModel[] };

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(BASE + path, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error("Training data is unavailable. Reload the page when the worker is connected.");
  return await response.json() as T;
}

export async function send<T>(method: "POST" | "PUT", path: string, body: unknown, refused: string): Promise<T> {
  const response = await fetch(BASE + path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify(body) });
  if (!response.ok) {
    const detail = await response.json().then((b: { detail?: unknown }) => b?.detail, () => undefined);
    throw new Error(response.status === 409 && typeof detail === "string" ? detail : refused);
  }
  return await response.json() as T;
}

/** Match balls against everything else (Not sure never trains). */
export function sides(labels: BallLabels[]): { balls: number; other: number } {
  let balls = 0, other = 0;
  for (const l of labels) for (const { label } of Object.values(l.items)) {
    if (label === "match_ball") balls++;
    else if (label !== "unsure") other++;
  }
  return { balls, other };
}
