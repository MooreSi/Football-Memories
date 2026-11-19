import { HOSTED } from "../api/hostedFlag";
import { hostedAllows } from "../api/hostedPermissions";
// Owner request 2026-11-13: show or hide the Hudl and Veo connections (this browser only).
export const HIDDEN_KEY = "fm.connections.hidden";

export function readHidden(): string[] {
  try { const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

export function connectionShown(id: string): boolean {
  // Hosted copies (decision 011, phase 2): only a service whose permission the user confirmed.
  if (HOSTED && !hostedAllows(id === "veo" ? "veo" : "hudl")) return false;
  return !readHidden().includes(id);
}
