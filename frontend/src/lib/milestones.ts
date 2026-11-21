import type { FootballRecord } from "./playerRecords";
export type Milestone = FootballRecord & { next: number | null; remaining: number | null; fraction: number | null };
const TARGETS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
export function milestones(cards: FootballRecord[], keeper: boolean): Milestone[] {
  const labels = keeper ? ["Games played", "Goals saved", "Goals conceded", "Penalties stopped", "Clean sheets", "Best saves in a match"]
    : ["Games played", "Goals scored", "Penalties scored", "Assists", "Shots on target", "Chances", "Passes", "Regains"];
  return labels.flatMap(label => {
    const card = cards.find(c => c.label === label);
    if (!card) return [];
    const target = card.value === null || ["Goals conceded", "Best saves in a match"].includes(label) ? null
      : TARGETS.find(n => n > card.value!) ?? (Math.floor(card.value / 1000) + 1) * 1000;
    return [{ ...card, next: target, remaining: target === null ? null : target - card.value!, fraction: target === null ? null : card.value! / target }];
  });
}
