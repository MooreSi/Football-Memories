/** Experimental browser notebook. Never changes authoritative source metadata. */
export type LabRecord = { match: string; player: string; position: string; minutes: number | null; counts: Record<string, number>; note: string };
export type LabGoal = { id: string; player: string; text: string; due: string; done: boolean; match: string; moment: string };
export type LabBook = { version: 1; records: LabRecord[]; goals: LabGoal[]; picks: string[] };
export const EMPTY_BOOK: LabBook = { version: 1, records: [], goals: [], picks: [] };
export const MANUAL_FIELDS = [
  ["goals", "Goals"], ["assists", "Assists"], ["shotAttempts", "Shots attempted"], ["shotOnTarget", "Shots on target"],
  ["passAttempts", "Passes attempted"], ["passCompleted", "Passes completed"], ["dribbleAttempts", "Dribbles attempted"], ["dribbleWins", "Successful dribbles"],
  ["defensiveAttempts", "Defensive 1v1s"], ["defensiveWins", "Defensive 1v1s won"],
  ["tackles", "Tackles"], ["interceptions", "Interceptions"], ["blocks", "Blocks"], ["clearances", "Clearances"],
  ["saves", "Saves"], ["conceded", "Goals conceded"],
] as const;
const pairs = [["passCompleted", "passAttempts", "Passes completed"], ["shotOnTarget", "shotAttempts", "Shots on target"],
  ["goals", "shotAttempts", "Goals"], ["goals", "shotOnTarget", "Goals"], ["dribbleWins", "dribbleAttempts", "Successful dribbles"], ["defensiveWins", "defensiveAttempts", "Defensive 1v1s won"]];
export function validateRecord(record: LabRecord): string | null {
  if (record.minutes !== null && (!Number.isFinite(record.minutes) || record.minutes < 0 || record.minutes > 600)) return "Minutes must be between 0 and 600.";
  for (const [key, value] of Object.entries(record.counts)) {
    if (!MANUAL_FIELDS.some(([k]) => k === key) || !Number.isInteger(value) || value < 0 || value > 10000) return "Counts must be whole numbers from 0 to 10,000.";
  }
  for (const [success, attempts, label] of pairs) {
    if (record.counts[success] !== undefined && record.counts[attempts] !== undefined && record.counts[success] > record.counts[attempts]) return `${label} cannot exceed ${attempts.replace(/([A-Z])/g, " $1").toLowerCase()}.`;
  }
  return null;
}
const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function validateBook(value: unknown): LabBook {
  const fail = () => { throw new Error("This is not a valid player lab notebook (version 1). Your saved draft has not changed."); };
  if (!obj(value) || value.version !== 1 || !Array.isArray(value.records) || !Array.isArray(value.goals) || !Array.isArray(value.picks)
    || value.records.length > 10000 || value.goals.length > 1000 || value.picks.length > 1000) return fail();
  const records: LabRecord[] = value.records.map(r => {
    if (!obj(r) || !text(r.match,256) || !r.match || !text(r.player,200) || !r.player || !text(r.position,40) || !text(r.note,4000)
      || !obj(r.counts) || !(r.minutes === null || typeof r.minutes === "number")) return fail();
    const clean: LabRecord = { match: r.match as string, player: r.player as string, position: r.position as string,
      minutes: r.minutes as number | null, counts: { ...r.counts } as Record<string,number>, note: r.note as string };
    if (validateRecord(clean)) return fail();
    return clean;
  });
  const goals: LabGoal[] = value.goals.map(g => {
    if (!obj(g) || !text(g.id,100) || !g.id || !text(g.player,200) || !g.player || !text(g.text,1000) || !g.text
      || !text(g.due,10) || (g.due !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(g.due as string)) || typeof g.done !== "boolean" || !text(g.match,256) || !text(g.moment,256)) return fail();
    return { id:g.id as string, player:g.player as string, text:g.text as string, due:g.due as string, done:g.done, match:g.match as string, moment:g.moment as string };
  });
  if (!value.picks.every(p=>text(p,600))) return fail();
  const recordKeys = records.map(r=>`${r.match}\u0000${r.player.trim().toUpperCase()}`);
  if (new Set(recordKeys).size !== records.length || new Set(goals.map(g=>g.id)).size !== goals.length) return fail();
  return { version:1, records, goals, picks:[...new Set(value.picks as string[])] };
}
