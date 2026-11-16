import type { HudlMoment } from "../api/hudl";
import { sameCode } from "./codes";
import { type GoalsEntry, type GoalsSource, matchGoals } from "./goals";
import { codeSides } from "./matchProfile";

/** Spec 300: one-click reels for one match, from moments the app already holds. "With
 *  <player>" means overlapping one of the player's tags (Hudl has no minutes played). */
export type ReelPreset = { id: "player" | "with-player" | "our-goals" | "every-goal" | "our-attacks"; label: string; name: string; momentIds: string[] };
type Moment = HudlMoment & { side?: string; team?: boolean };
type PresetSource = GoalsSource & { moments?: Moment[]; team_moments?: Moment[] };

const ATTACK = new Set(["GOAL", "CHANCE", "SHOT", "ON TARGET"]);
const touches = (a: HudlMoment, b: HudlMoment) => a.time_s <= b.time_s + b.duration_s && b.time_s <= a.time_s + a.duration_s;

export function reelPresets(match: PresetSource, club: string | null, player: string | null, entry?: GoalsEntry | null): ReelPreset[] {
  const isVeo = match.source === "veo" || Boolean(match.team_data);
  const pool: Moment[] = isVeo ? match.team_moments ?? [] : match.moments ?? [];
  const byId = new Map(pool.map((m) => [m.id, m]));
  const inOrder = (ids: string[]) => [...new Set(ids)].filter((id) => byId.has(id)).sort((a, b) => byId.get(a)!.time_s - byId.get(b)!.time_s);
  const goals = matchGoals(match, club, entry).goals.filter((g) => !g.added);
  const ourGoals = new Set(goals.filter((g) => g.side === "ours").map((g) => g.id));
  // Hudl attacking tags of ours, plus the goals matchGoals counts as ours (it also reads
  // a lone "<club> GOAL" code when no home club is set).
  const place = codeSides(pool, club);
  const ourAttack = (m: Moment) => ourGoals.has(m.id) || (() => { const p = place(m.category); return p.side === "ours" && ATTACK.has(p.stem); })();
  const presets: ReelPreset[] = [];

  if (!isVeo && player) {
    const own = pool.filter((m) => sameCode(m.category, player));
    if (own.length) {
      const shown = own[0].category;
      presets.push({ id: "player", label: `${shown}'s moments`, name: `${shown} highlights`, momentIds: inOrder(own.map((m) => m.id)) });
      const team = pool.filter((m) => !sameCode(m.category, player) && ourAttack(m));
      presets.push({ id: "with-player", label: `Team moments with ${shown}`, name: `Team moments with ${shown}`,
        momentIds: inOrder(team.filter((m) => own.some((o) => touches(o, m))).map((m) => m.id)) });
    }
  }
  presets.push({ id: "our-goals", label: "Our goals", name: "Our goals", momentIds: inOrder(goals.filter((g) => g.side === "ours").map((g) => g.id)) });
  presets.push({ id: "every-goal", label: "Every goal", name: "Every goal", momentIds: inOrder(goals.map((g) => g.id)) });
  let attacks: string[];
  if (isVeo) attacks = pool.filter((m) => m.category === "OUR GOAL" || m.category === "OUR SHOT").map((m) => m.id);
  else attacks = pool.filter(ourAttack).map((m) => m.id);
  presets.push({ id: "our-attacks", label: "Our goals and chances", name: "Our goals and chances", momentIds: inOrder(attacks) });

  const seen = new Set<string>();
  return presets.filter((p) => {
    const key = p.momentIds.join("|");
    if (!p.momentIds.length || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
