import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { Seen } from "./alerts";

/** Spec 230: notes, continue watching and the alerts snapshot (backend `preferences`). */
export type Shape = { kind: "arrow" | "line"; x1: number; y1: number; x2: number; y2: number; colour?: string };
export type MomentNote = { moment_id: string; match_id: string; time_s: number; text: string; shapes: Shape[]; updated_at?: number };
export type Watching = { match_id: string; position_s: number; duration_s: number; updated_at: number };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error("Could not save that. Is the app's backend running?");
  return res.json();
}

/** Notes and watch rows are arrays; anything else (an older backend, an error page) is empty. */
function list<T>(data: T[]): T[] {
  return Array.isArray(data) ? data : [];
}

export function useNotes(matchId: string) {
  return useQuery<MomentNote[]>({ queryKey: ["notes", matchId], queryFn: () => request(`/api/notes?match_id=${encodeURIComponent(matchId)}`), retry: false, select: list });
}

export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: MomentNote) => request<MomentNote[]>("/api/notes", { method: "PUT", body: JSON.stringify(note) }),
    onSuccess: (data, note) => qc.setQueryData(["notes", note.match_id], data),
  });
}

export function useWatching() {
  return useQuery<Watching[]>({ queryKey: ["watching"], queryFn: () => request("/api/watching"), retry: false, select: list });
}

/** Saves the stream position at most every `everyMs` (and when the time jumps). */
export function useRecordWatching(matchId: string, duration: number | undefined, everyMs = 10_000) {
  const last = useRef<{ at: number; pos: number }>({ at: 0, pos: -1 });
  return useCallback((position: number) => {
    const now = Date.now();
    const jumped = Math.abs(position - last.current.pos) > 30;
    if (position < 1 || (now - last.current.at < everyMs && !jumped)) return;
    last.current = { at: now, pos: position };
    void request("/api/watching", { method: "PUT", body: JSON.stringify({ match_id: matchId, position_s: position, duration_s: duration ?? 0 }) }).catch(() => undefined);
  }, [matchId, duration, everyMs]);
}

/** Unfinished matches, newest first: started (a minute in) and not near the end. */
export function unfinished(rows: Watching[] | undefined, durations: Map<string, number | undefined>): Watching[] {
  return (rows ?? []).filter((w) => {
    if (!durations.has(w.match_id) || w.position_s < 60) return false;
    const total = durations.get(w.match_id) || w.duration_s;
    return !total || w.position_s < total - 180;
  });
}

export function useAlertsSeen() {
  return useQuery<Seen | null>({ queryKey: ["alerts-seen"], queryFn: () => request("/api/alerts/seen"), retry: false,
    // A snapshot from an older or broken backend is treated as none (nothing is reported as new).
    select: (d: Seen | null) => (d && Array.isArray(d.matches) && typeof d.counts === "object" ? d : null) });
}

export function useSaveAlertsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (seen: Seen) => request<Seen>("/api/alerts/seen", { method: "PUT", body: JSON.stringify(seen) }),
    onSuccess: (data) => qc.setQueryData(["alerts-seen"], data),
  });
}
