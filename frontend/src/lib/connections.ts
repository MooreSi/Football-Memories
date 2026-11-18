import { HOSTED } from "../api/helperBase";
// Owner request 2026-11-13: show or hide the Hudl and Veo connections (this browser only).
export const HIDDEN_KEY = "fm.connections.hidden";

export function readHidden(): string[] {
  try { const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

export function connectionShown(id: string): boolean {
  // Hosted copies cannot reach the desktop helper (owner decision 011): neither is shown.
  if (HOSTED) return false;
  return !readHidden().includes(id);
}
