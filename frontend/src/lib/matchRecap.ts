import { sameCode } from "./codes";
import type { GameState } from "./gameState";
import type { MatchGoals } from "./goals";
import { ukDate } from "./hudlFixture";
import type { Score } from "./matchScore";
import type { TeamRow } from "./veoTeamSplit";

/** Spec 310: a short written recap of one match. Every sentence is written only when the
 *  app holds its facts; scorers and keepers only once the owner has confirmed them. The
 *  player is named, never given a pronoun. */
export type RecapFacts = {
  /** Our club's name; null says "We". */
  ours: string | null; opponent: string | null; venue: "Home" | "Away" | null; date: Date | null;
  score: Score | null; state: GameState; halfTime_s: number | null; goals: MatchGoals | null;
  player: { name: string; moments: number } | null; veoRows: TeamRow[];
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function matchRecap(f: RecapFacts): { sentences: string[]; note: string } {
  const opp = f.opponent ?? "the opposition";
  const on = f.date ? ` on ${ukDate(f.date)}` : "";
  const subject = f.ours ?? "We";
  const they = f.ours ? "They" : "We";
  const sentences: string[] = [];
  if (!f.score) sentences.push(`${subject} played ${opp}${on}. The score is not known.`);
  else {
    const { ours: o, theirs: t } = f.score;
    const verb = o > t ? "won" : o < t ? "lost" : "drew";
    const place = f.venue === "Home" ? `at home against ${opp}` : f.venue === "Away" ? `away at ${opp}` : `against ${opp}`;
    sentences.push(`${subject} ${verb} ${o}-${t} ${place}${on}.`);
  }

  const s = f.state;
  if (s.complete) {
    const down = s.biggestDeficit > 1 ? `${s.biggestDeficit} goals down` : "behind";
    if (s.story === "came-from-behind-win") sentences.push(`${they} came from ${down} to win.`);
    else if (s.story === "came-from-behind-draw") sentences.push(`${they} came from ${down} to draw.`);
    else if (s.story === "led-drew") sentences.push(`${they} led but were held to a draw.`);
    else if (s.story === "led-lost") sentences.push(`${they} led but lost.`);
    else if (s.firstGoal === "ours") sentences.push(`${they} scored first.`);
    else if (s.firstGoal === "theirs") sentences.push(`${they} conceded first.`);
    if (f.halfTime_s !== null) {
      const before = s.goals.filter((x) => x.time_s < f.halfTime_s!);
      const last = before[before.length - 1];
      sentences.push(`It was ${last ? `${last.ours}-${last.theirs}` : "0-0"} at half-time.`);
    }
  }

  const goals = f.goals?.goals ?? [];
  const scorers = new Map<string, { name: string; n: number }>();
  for (const x of goals) {
    if (x.side !== "ours" || !x.confirmed || !x.scorer || /^own goal$/i.test(x.scorer)) continue;
    const key = x.scorer.toUpperCase();
    scorers.set(key, { name: x.scorer, n: (scorers.get(key)?.n ?? 0) + 1 });
  }
  if (scorers.size) {
    const list = [...scorers.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
    sentences.push(`Goals: ${list.map((x) => (x.n > 1 ? `${x.name} ${x.n}` : x.name)).join(", ")}.`);
  }
  for (const k of f.goals?.keepers ?? []) {
    if (!k.confirmed || !k.name) continue;
    sentences.push(`${k.name} kept goal${k.saves !== null ? ` and made ${plural(k.saves, "save")}` : ""}.`);
  }

  if (f.player && f.player.moments > 0) {
    const ours = goals.filter((x) => x.side === "ours" && !x.added);
    const featured = ours.filter((x) => x.candidates.some((c) => sameCode(c, f.player!.name))).length;
    sentences.push(`${f.player.name} was tagged in ${plural(f.player.moments, "moment")}${featured ? `, including ${featured} of the ${ours.length} goals we scored` : ""}.`);
  }

  const row = (label: string) => f.veoRows.find((r) => r.label === label);
  const parts = [["Attempts", "attempt"], ["Corners", "corner"]].flatMap(([label, word]) => {
    const r = row(label);
    return r ? [`${plural(r.own, word)} to ${r.opponent}`] : [];
  });
  if (parts.length) sentences.push(`Veo counted ${parts.join(" and ")}.`);

  return { sentences, note: "Written from the score, goal times and tags in this app. Scorers and keepers appear once confirmed in Goals and keepers." };
}
