import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Review } from "./labTypes";

export const BASE = "/_admin/api/video-analytics";

/** A fixed-name, manifest-declared artifact of a completed run; absent files are never requested. */
export function useJobFile<T>(jobId: string, name: string, available: boolean, validate: (value: unknown) => value is T) {
  return useQuery({
    queryKey: ["video-lab-file", jobId, name], enabled: available, retry: false, staleTime: Infinity,
    queryFn: async () => {
      const response = await fetch(`${BASE}/jobs/${jobId}/files/${name}`, { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`${name} unavailable`);
      const value: unknown = await response.json();
      if (!validate(value)) throw new Error(`${name} invalid`);
      return value;
    },
  });
}

export async function csrfToken() {
  const me = await fetch("/_portal/api/me", { credentials: "same-origin", cache: "no-store" });
  if (!me.ok) throw new Error("Please sign in again.");
  return (await me.json() as { csrf_token: string }).csrf_token;
}

const empty = (review: Partial<Review>): Review => ({
  revision: 0, source_sha256: "", events: [], identities: [], reviewed_intervals: [], review_complete: false,
  track_labels: [], group_labels: [], rejected_suggestions: [], ...review,
});

function body(review: Review) {
  return {
    revision: review.revision, source_sha256: review.source_sha256,
    events: review.events.map(({ id, type, time_s, track_id, confirmed, team }) => ({ id, type, time_s, track_id, confirmed, team: team ?? null })),
    identities: review.identities.map(({ track_id, player_id, start_s, end_s }) => ({ track_id, player_id, start_s, end_s })),
    reviewed_intervals: review.reviewed_intervals, review_complete: review.review_complete,
    track_labels: review.track_labels, group_labels: review.group_labels, rejected_suggestions: review.rejected_suggestions,
  };
}

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/** Your labels for one run, saved automatically shortly after each change (revisioned, CSRF). */
export function useReview(jobId: string, delay = 1200) {
  const [review, setReview] = useState<Review | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const latest = useRef<Review | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    let live = true;
    setReview(null); setState("idle"); setError("");
    fetch(`${BASE}/jobs/${jobId}/review`, { credentials: "same-origin", cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Your labels could not be loaded. Reload the page."); return empty(await response.json() as Partial<Review>); })
      .then(value => { if (live) { latest.current = value; setReview(value); } })
      .catch((e: unknown) => { if (live) { setError(e instanceof Error ? e.message : "Labels unavailable."); setState("error"); } });
    return () => { live = false; if (timer.current) clearTimeout(timer.current); };
  }, [jobId]);
  const save = useCallback(async () => {
    const current = latest.current;
    if (!current || saving.current) return;
    saving.current = true; setState("saving");
    try {
      const token = await csrfToken();
      const response = await fetch(`${BASE}/jobs/${jobId}/review`, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": token }, body: JSON.stringify(body(current)) });
      if (!response.ok) throw new Error(response.status === 409 ? "Your labels changed in another window. Reload the page before continuing." : "Your labels could not be saved. Undo the last change or reload.");
      const saved = await response.json() as Review;
      const changedMeanwhile = latest.current !== current;
      latest.current = changedMeanwhile ? { ...latest.current!, revision: saved.revision } : empty(saved);
      setReview(latest.current);
      setState(changedMeanwhile ? "pending" : "saved"); setError("");
      if (changedMeanwhile) timer.current = setTimeout(() => void save(), delay);
    } catch (e) { setError(e instanceof Error ? e.message : "Your labels could not be saved."); setState("error"); }
    finally { saving.current = false; }
  }, [jobId, delay]);
  const update = useCallback((change: (review: Review) => Review) => {
    if (!latest.current) return;
    latest.current = change(latest.current);
    setReview(latest.current); setState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), delay);
  }, [save, delay]);
  return { review, update, state, error, saveNow: save };
}
