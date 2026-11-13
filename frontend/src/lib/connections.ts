// Owner request 2026-11-13: show or hide the Hudl and Veo connections (this browser only).
export const HIDDEN_KEY = "fm.connections.hidden";

export function readHidden(): string[] {
  try { const v = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

export function connectionShown(id: string): boolean {
  return !readHidden().includes(id);
}
