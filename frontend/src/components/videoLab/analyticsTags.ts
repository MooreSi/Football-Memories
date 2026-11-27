import type { BallPoint } from "./ball";
import type { Assignment, Observation, Team } from "./labTypes";
import { pointAt, type PitchPoint } from "./livePitch";
import type { PitchSize } from "./metres";

/* Pitch analytics tags: Hudl-style match tags read from the live 2D pitch (the ball's and every
 * placed player's ground position over time). They sit beside Hudl's, Veo's and your tags and are
 * always labelled as analytics, never as Hudl tags: estimates from tracked positions, not a person's
 * tagging. Pitch coordinates follow livePitch: x along the near touchline (0..length), y across.
 *
 * Possession goes to the team with a player within reach of the ball; everything else (passes,
 * entries into thirds and the box, the ball going out and how play restarts, chances) is read from
 * how possession and the ball move. Scored against Hudl's tags on the same footage with
 * scripts/score-analytics-tags.mjs; the parameters below were tuned there (see the domain notes). */
export const ANALYTICS_TYPES = [
  "possession", "contested_possession", "ball_out_of_play", "throw", "goal_kick", "corner", "free_kick",
  "defensive_third_entry", "midfield_third_entry", "attacking_third_entry", "penalty_area_entry",
  "pass", "cross", "chance", "on_target", "goal",
] as const;
export type AnalyticsType = (typeof ANALYTICS_TYPES)[number];
export type AnalyticsTag = { id: string; type: AnalyticsType; team: Team | null; time_s: number; end_s: number; track_id: number | null; evidence: string };
export type TeamAt = (track: number, time: number) => Assignment | undefined;

export const DEFAULT_PARAMS = {
  /** Seconds between possession checks. */
  step_s: 0.2,
  /** How long the ball position is held after its last sighting. */
  ball_hold_s: 0.5,
  /** A player this close to the ball (metres) has it. */
  reach_m: 1.5,
  /** Both teams this close, within this margin of each other: contested. */
  contest_margin_m: 0.4,
  /** Checks in a row a team must have the ball before possession changes. */
  confirm_checks: 4,
  /** Shortest possession tagged, seconds. */
  min_possession_s: 1,
  /** Shortest contested spell tagged, seconds. */
  min_contested_s: 2,
  /** Metres beyond a line before the ball counts as out (positions are approximate). */
  out_margin_m: 0,
  /** Ball sightings in a row beyond the line before it is out. */
  out_samples: 3,
  /** A pass: the ball travels at least this far between two players of one team... */
  pass_min_m: 5,
  /** ...within this long. */
  pass_max_s: 4,
  /** A chance: ball speed towards goal at least this (m/s)... */
  shot_speed_ms: 5,
  /** ...ending within this share of the length from the goal line. */
  shot_reach: 0.12,
  /** Seconds a forward third must hold before its entry is tagged. */
  entry_hold_s: 1.5,
  /** A stoppage: the median player runs slower than this (m/s)... */
  slow_ms: 1,
  /** ...for at least this long (0 turns it off)... */
  slow_s: 6,
  /** ...counting only moments with at least this many players placed... */
  slow_players: 4,
  /** ...and allowing gaps this long; it began about this much before they slowed. */
  slow_gap_s: 0.5, slow_lead_s: 1,
  /** A ball moving faster than this (m/s) is in play, however slowly people move. */
  ball_play_ms: 3,
  /** Restart: the ball's last sighting within this long before play restarts... */
  restart_look_s: 3,
  /** ...and the player within this many metres takes it. */
  restart_reach_m: 4,
  /** A ball held up this soon after the restart still belongs to it... */
  restart_after_s: 1.5,
  /** ...by a player standing within this many metres of a touchline: a throw. */
  held_touch_m: 6,
  /** A quick throw needs the ball seen held up this many times in a row (0 turns quick throws off). */
  quick_throw_holds: 3,
  /** Throws closer together than this are one throw. */
  throw_gap_s: 8,
  /** A restart this close (metres) to the centre spot is a kick-off after a goal. */
  centre_m: 5,
  /** Restart zones: metres from both lines for a corner, from a touchline for a throw... */
  corner_m: 5, touch_m: 3,
  /** ...and share of the length from the goal line, of the width from the middle, for a goal kick. */
  goal_area: 0.12, goal_width: 0.3,
};
export type AnalyticsParams = typeof DEFAULT_PARAMS;

const BOX_DEPTH = 0.157, BOX_WIDTH = 0.593, GOAL_WIDTH = 0.11, WING = 0.3;
type Control = { time: number; team: Team | null; track: number | null; contested: boolean };
const playing = (a: Assignment | undefined): a is Assignment & { team: Team } => !!a?.team && (a.role === "player" || a.role === "goalkeeper");
const other = (team: Team): Team => team === "own" ? "opponent" : "own";
const round = (t: number) => Math.round(t * 100) / 100;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[s.length >> 1];
}

export type Held = { time_s: number; track_id: number };

/** Moments a person holds the ball up, read from the picture: the ball at or just above the top of
 * their box (a throw-in, a keeper's catch). A raised ball projects metres off its true ground spot,
 * so the holder's feet place a throw where the ball cannot. */
export function ballsHeld(rows: Observation[], ball: BallPoint[]): Held[] {
  const byTime = new Map<number, Observation[]>();
  for (const o of rows) if (o.image_box?.length === 4) (byTime.get(o.time_s) ?? byTime.set(o.time_s, []).get(o.time_s)!).push(o);
  const out: Held[] = [];
  for (const b of ball) {
    let best: { track: number; d: number } | null = null;
    for (const o of byTime.get(b.time_s) ?? []) {
      const [x0, y0, x1, y1] = o.image_box!, h = y1 - y0, w = x1 - x0;
      if (h <= 0 || b.x < x0 - 0.25 * w || b.x > x1 + 0.25 * w || b.y < y0 - 0.5 * h || b.y > y0 + 0.3 * h) continue;
      const d = Math.abs(b.x - (x0 + x1) / 2) / w + Math.abs(b.y - y0) / h;
      if (!best || d < best.d) best = { track: o.track_id, d };
    }
    if (best) out.push({ time_s: b.time_s, track_id: best.track });
  }
  return out;
}

/** +1 when our team attacks towards x = length, -1 towards x = 0, null when nothing shows it.
 * Keepers decide it when both teams have one; otherwise, second by second, the team whose deepest
 * player is nearer an end defends that end. One analysis window never spans half time. */
export function attackDirection(paths: Map<number, PitchPoint[]>, teamAt: TeamAt, { length_m: l }: PitchSize): 1 | -1 | null {
  const keeper: Record<Team, number[]> = { own: [], opponent: [] };
  for (const [track, path] of paths) for (const p of path) {
    const a = teamAt(track, p.time_s);
    if (playing(a) && a.role === "goalkeeper") keeper[a.team].push(p.x);
  }
  if (keeper.own.length && keeper.opponent.length) return median(keeper.own) < median(keeper.opponent) ? 1 : -1;
  if (keeper.own.length) return median(keeper.own) < l / 2 ? 1 : -1;
  if (keeper.opponent.length) return median(keeper.opponent) > l / 2 ? 1 : -1;
  const seconds = new Map<number, Record<Team, number[]>>();
  for (const [track, path] of paths) for (const p of path) {
    const a = teamAt(track, p.time_s);
    if (!playing(a)) continue;
    const s = Math.floor(p.time_s), bucket = seconds.get(s) ?? { own: [], opponent: [] };
    bucket[a.team].push(p.x); seconds.set(s, bucket);
  }
  let votes = 0;
  for (const { own, opponent } of seconds.values()) {
    if (!own.length || !opponent.length) continue;
    const ownLow = Math.min(...own), oppLow = Math.min(...opponent), ownHigh = Math.max(...own), oppHigh = Math.max(...opponent);
    votes += Math.sign(oppLow - ownLow) + Math.sign(oppHigh - ownHigh);
  }
  return votes > 0 ? 1 : votes < 0 ? -1 : null;
}

type Input = { paths: Map<number, PitchPoint[]>; ball: PitchPoint[]; size: PitchSize; teamAt: TeamAt; params?: Partial<AnalyticsParams>; held?: Held[] };

export function analyticsTags({ paths, ball, size, teamAt, params, held = [] }: Input): AnalyticsTag[] {
  const p = { ...DEFAULT_PARAMS, ...params };
  if (!ball.length) return [];
  const { length_m: l, width_m: w } = size;
  const dir = attackDirection(paths, teamAt, size) ?? 1;
  /** How far up the pitch a point is for a team: 0 at its own goal line, 1 at the one it attacks. */
  const progress = (team: Team, x: number) => { const f = x / l; return (team === "own") === (dir > 0) ? f : 1 - f; };
  const third = (team: Team, x: number) => { const f = progress(team, x); return f < 1 / 3 ? 0 : f < 2 / 3 ? 1 : 2; };
  const inBox = (team: Team, q: PitchPoint) => progress(team, q.x) >= 1 - BOX_DEPTH && Math.abs(q.y - w / 2) <= (BOX_WIDTH * w) / 2;
  /** The team defending the goal at the x = 0 end. */
  const defendsLow: Team = dir > 0 ? "own" : "opponent";
  const tags: AnalyticsTag[] = [];
  const add = (type: AnalyticsType, team: Team | null, time: number, end: number, track: number | null, evidence: string) =>
    tags.push({ id: `analytics-${type}-${team ?? "none"}-${Math.round(time * 100)}`, type, team, time_s: round(time), end_s: round(Math.max(time, end)), track_id: track, evidence });

  // 1. Who has the ball at each check.
  const sorted = [...ball].sort((a, b) => a.time_s - b.time_s);
  const t0 = sorted[0].time_s, t1 = sorted[sorted.length - 1].time_s;
  const controls: Control[] = [];
  const ballAt = new Map<number, PitchPoint | null>();
  for (let i = 0; t0 + i * p.step_s <= t1 + 1e-9; i++) {
    const t = round(t0 + i * p.step_s), b = pointAt(sorted, t, p.ball_hold_s);
    ballAt.set(t, b);
    if (!b) { controls.push({ time: t, team: null, track: null, contested: false }); continue; }
    const near: Record<Team, { d: number; track: number } | null> = { own: null, opponent: null };
    for (const [track, path] of paths) {
      const a = teamAt(track, t);
      if (!playing(a)) continue;
      const q = pointAt(path, t);
      if (!q) continue;
      const d = Math.hypot(q.x - b.x, q.y - b.y);
      if (d <= p.reach_m && (!near[a.team] || d < near[a.team]!.d)) near[a.team] = { d, track };
    }
    const o = near.own, x = near.opponent;
    if (o && x && Math.abs(o.d - x.d) < p.contest_margin_m) controls.push({ time: t, team: null, track: null, contested: true });
    else if (o || x) { const team: Team = !x || (o && o.d < x.d) ? "own" : "opponent"; controls.push({ time: t, team, track: near[team]!.track, contested: false }); }
    else controls.push({ time: t, team: null, track: null, contested: false });
  }

  // 2. Ball out of play. Seen leaving over a line, or (far more often on a panning camera, which
  // rarely shows the ball go out) a stoppage: the players stand and the ball is not being played.
  // On Stoke the median player ran 2.1 m/s in play and 0.9 m/s while Hudl had the ball out of play.
  const outside = (q: PitchPoint) => q.x < -p.out_margin_m || q.x > l + p.out_margin_m || q.y < -p.out_margin_m || q.y > w + p.out_margin_m;
  type Stoppage = { start: number; end: number; exit: PitchPoint | null };
  const found: Stoppage[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (!outside(sorted[i])) continue;
    let j = i;
    while (j + 1 < sorted.length && outside(sorted[j + 1])) j++;
    if (j - i + 1 >= p.out_samples) {
      const back = sorted.findIndex((q, k) => k > j && !outside(q));
      found.push({ start: i > 0 ? sorted[i - 1].time_s : sorted[i].time_s, end: back < 0 ? t1 : sorted[back].time_s, exit: sorted[j] });
    }
    i = j;
  }
  // How fast the players are moving: the median speed of placed outfield players, half-second bins.
  const bins = new Map<number, number[]>();
  for (const [track, path] of paths) for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dt = b.time_s - a.time_s;
    const who = teamAt(track, b.time_s);
    // Keepers stand most of the time; outfield players show whether play is on.
    if (dt <= 0 || dt > 1 || !playing(who) || who.role === "goalkeeper") continue;
    const k = Math.floor(b.time_s / 0.5);
    (bins.get(k) ?? bins.set(k, []).get(k)!).push(Math.hypot(b.x - a.x, b.y - a.y) / dt);
  }
  const activity = (t: number) => {
    const k = Math.floor(t / 0.5), v = [...(bins.get(k - 1) ?? []), ...(bins.get(k) ?? []), ...(bins.get(k + 1) ?? [])];
    return v.length >= p.slow_players ? median(v) : null;
  };
  const ballSpeed = new Map<number, number>();
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i], dt = b.time_s - a.time_s;
    if (dt > 0 && dt <= 1) for (let t = Math.ceil(a.time_s / p.step_s) * p.step_s; t <= b.time_s + 1e-9; t += p.step_s) ballSpeed.set(round(t), Math.hypot(b.x - a.x, b.y - a.y) / dt);
  }
  if (p.slow_s > 0) {
    let from: number | null = null, lastSlow = -Infinity;
    const flush = () => { if (from !== null && lastSlow - from >= p.slow_s) found.push({ start: Math.max(t0, from - p.slow_lead_s), end: lastSlow, exit: null }); from = null; };
    for (let t = t0; t <= t1 + 1e-9; t = round(t + p.step_s)) {
      const v = activity(t), fast = (ballSpeed.get(round(t)) ?? 0) > p.ball_play_ms;
      if (v !== null && v < p.slow_ms && !fast) { if (from === null || t - lastSlow > p.slow_gap_s) { flush(); from = t; } lastSlow = t; }
      else if (fast || (v !== null && t - lastSlow > p.slow_gap_s)) flush();
    }
    flush();
  }
  found.sort((x, y) => x.start - y.start);
  const stoppages: Stoppage[] = [];
  for (const f of found) {
    const last = stoppages[stoppages.length - 1];
    if (last && f.start <= last.end + p.slow_gap_s) { last.end = Math.max(last.end, f.end); last.exit ??= f.exit; }
    else stoppages.push({ ...f });
  }
  const stopped = (t: number) => stoppages.some(s => t >= s.start && t < s.end);

  // 3. Possession spells from confirmed control, cut by stoppages.
  type Spell = { team: Team; start: number; end: number; touches: Control[] };
  const spells: Spell[] = [];
  let current = null as Spell | null, pending: Control[] = [];
  let contestedFrom: number | null = null;
  const contested: [number, number][] = [];
  const close = (time: number) => { if (current) { current.end = time; spells.push(current); current = null; } };
  for (const c of controls) {
    if (stopped(c.time)) {
      close(stoppages.find(s => c.time >= s.start && c.time < s.end)!.start); pending = [];
      if (contestedFrom !== null) { contested.push([contestedFrom, c.time]); contestedFrom = null; }
      continue;
    }
    if (c.contested) { contestedFrom ??= c.time; continue; }
    if (contestedFrom !== null && c.team) { contested.push([contestedFrom, c.time]); contestedFrom = null; }
    if (!c.team) continue;
    if (current?.team === c.team) { current.touches.push(c); pending = []; continue; }
    pending = pending.length && pending[0].team === c.team ? [...pending, c] : [c];
    if (pending.length >= p.confirm_checks || (!current && !spells.length)) {
      close(pending[0].time);
      current = { team: c.team, start: pending[0].time, end: pending[0].time, touches: pending };
      pending = [];
    }
  }
  close(t1);
  for (const [a, b] of contested) if (b - a >= p.min_contested_s) add("contested_possession", null, a, b, null, `Both teams within ${p.reach_m} m of the ball`);

  const where = (q: PitchPoint) => `${Math.round(q.x)} m along, ${Math.round(q.y)} m in`;
  for (const [n, s] of spells.entries()) {
    if (s.end - s.start < p.min_possession_s) continue;
    const next = spells[n + 1];
    const end = next && next.start - s.end < p.pass_max_s ? Math.max(s.end, next.start) : s.end;
    add("possession", s.team, s.start, end, s.touches[0]?.track ?? null, `Player within ${p.reach_m} m of the ball`);
    // Entries: the third it starts in, then each third further forward the ball holds.
    const first = ballAt.get(s.start);
    if (!first) continue;
    let reached = third(s.team, first.x), boxed = inBox(s.team, first);
    add((["defensive_third_entry", "midfield_third_entry", "attacking_third_entry"] as const)[reached], s.team, s.start, s.start, s.touches[0]?.track ?? null, `Possession starts ${where(first)}`);
    let since: number | null = null, candidate = reached;
    for (let t = s.start; t <= end + 1e-9; t = round(t + p.step_s)) {
      const q = ballAt.get(round(t));
      if (!q) continue;
      if (!boxed && inBox(s.team, q)) { boxed = true; add("penalty_area_entry", s.team, t, t, null, `Ball into the box at ${where(q)}`); }
      const now = third(s.team, q.x);
      if (now > reached) {
        if (since === null || now !== candidate) { since = t; candidate = now; }
        if (t - since >= p.entry_hold_s) {
          for (let k = reached + 1; k <= candidate; k++) add((["defensive_third_entry", "midfield_third_entry", "attacking_third_entry"] as const)[k], s.team, since, since, null, `Ball carried to ${where(q)}`);
          reached = candidate; since = null;
        }
      } else since = null;
    }
  }

  // 4. Passes and crosses: the ball between two players of one team, inside one spell.
  for (const s of spells) for (let i = 1; i < s.touches.length; i++) {
    const a = s.touches[i - 1], b = s.touches[i];
    if (a.track === null || b.track === null || a.track === b.track || b.time - a.time > p.pass_max_s) continue;
    const from = ballAt.get(a.time), to = ballAt.get(b.time);
    if (!from || !to) continue;
    // Pass length is passer to receiver; the ball is only seen near each of them.
    const passer = pointAt(paths.get(a.track) ?? [], a.time), receiver = pointAt(paths.get(b.track) ?? [], b.time);
    const dist = passer && receiver ? Math.hypot(receiver.x - passer.x, receiver.y - passer.y) : Math.hypot(to.x - from.x, to.y - from.y);
    if (dist < p.pass_min_m) continue;
    const wide = Math.abs(from.y - w / 2) > WING * w && third(s.team, from.x) === 2;
    if (wide && inBox(s.team, to)) add("cross", s.team, a.time, b.time, a.track, `Ball from the wing into the box, ${Math.round(dist)} m`);
    add("pass", s.team, a.time, b.time, a.track, `Ball from one player to a team-mate, ${Math.round(dist)} m`);
  }

  // 5. Chances: a fast ball towards the goal the team on it attacks, ending near that goal.
  const attackedEnd = (team: Team) => (team === defendsLow ? l : 0);
  for (const s of spells) {
    const goalX = attackedEnd(s.team);
    const window = sorted.filter(q => q.time_s >= s.start && q.time_s <= s.end + 1.5);
    for (let i = 1; i < window.length; i++) {
      const a = window[i - 1], b = window[i], dt = b.time_s - a.time_s;
      if (dt <= 0 || dt > 1) continue;
      const towards = (goalX > 0 ? b.x - a.x : a.x - b.x) / dt;
      if (towards < p.shot_speed_ms || Math.abs(b.x - goalX) > p.shot_reach * l) continue;
      const shooter = [...s.touches].reverse().find(c => c.time <= a.time_s + 1e-9)?.track ?? null;
      add("chance", s.team, a.time_s, b.time_s, shooter, `Ball towards goal at ${Math.round(towards)} m/s`);
      // Where it crosses the goal line, if it does.
      const after = sorted.find(q => q.time_s > a.time_s && (goalX > 0 ? q.x >= l : q.x <= 0));
      if (after && after.time_s - a.time_s < 2.5) {
        const prev = sorted[sorted.indexOf(after) - 1] ?? a, f = (goalX - prev.x) / ((after.x - prev.x) || 1e-9), y = prev.y + (after.y - prev.y) * f;
        if (Math.abs(y - w / 2) <= (GOAL_WIDTH * w) / 2 + 1) add("on_target", s.team, a.time_s, after.time_s, shooter, "Ball crosses the goal line between the posts");
      }
      break;
    }
  }

  // 6. Restarts: how play resumes, from where the ball rests when it is played again.
  const nearestAt = (q: PitchPoint, t: number) => {
    let best: { track: number; team: Team; d: number } | null = null;
    for (const [track, path] of paths) {
      const a = teamAt(track, t), at = pointAt(path, t);
      if (!playing(a) || !at) continue;
      const d = Math.hypot(at.x - q.x, at.y - q.y);
      if (d <= p.restart_reach_m && (!best || d < best.d)) best = { track, team: a.team, d };
    }
    return best;
  };
  for (const st of stoppages) {
    const lastTeam = spells.filter(s => s.start <= st.start).at(-1)?.team ?? null;
    add("ball_out_of_play", null, st.start, st.end, null, st.exit ? `Ball beyond the line at ${where(st.exit)}` : "Players stopped and the ball was not in play");
    // The ball where play restarts: the last sighting up to the restart, else the first just after.
    const spot = [...sorted].reverse().find(q => q.time_s <= st.end + 1e-9 && q.time_s >= st.end - p.restart_look_s) ?? sorted.find(q => q.time_s >= st.end && q.time_s <= st.end + 1) ?? null;
    const taker = spot ? nearestAt(spot, st.end) : null;
    const endLow = (q: PitchPoint) => q.x < l / 2;
    const toLine = spot ? Math.min(spot.x, l - spot.x) : Infinity, toTouch = spot ? Math.min(spot.y, w - spot.y) : Infinity;
    const exitGoalLine = !!st.exit && (st.exit.x < -p.out_margin_m || st.exit.x > l + p.out_margin_m);
    const atCorner = spot && toLine <= p.corner_m && toTouch <= p.corner_m;
    const byGoal = spot && toLine <= p.goal_area * l && Math.abs(spot.y - w / 2) <= p.goal_width * w;
    const onTouch = spot && toTouch <= p.touch_m;
    const defending = (q: PitchPoint): Team => (endLow(q) ? defendsLow : other(defendsLow));
    const at = (zone: unknown) => (zone ? taker?.track ?? null : null);
    // An outfield player holding the ball up near a touchline as play restarts: a throw from their feet.
    const thrower = exitGoalLine ? undefined : [...held].reverse().map(h => {
      const who = teamAt(h.track_id, h.time_s), feet = pointAt(paths.get(h.track_id) ?? [], h.time_s, 1);
      return h.time_s >= st.start && h.time_s <= st.end + p.restart_after_s && playing(who) && who.role !== "goalkeeper" && feet && Math.min(feet.y, w - feet.y) <= p.held_touch_m ? { ...h, team: who.team, feet } : null;
    }).find(Boolean);
    const next = spells.find(s => s.start >= st.end - 1e-9)?.team ?? null;
    const centre = spot && Math.hypot(spot.x - l / 2, spot.y - w / 2) <= p.centre_m;
    if (centre && !thrower) {
      // Kick-off: the team kicking off conceded, so the stoppage began with the other team's goal.
      const kicker = taker?.team ?? next;
      const scorer = kicker ? other(kicker) : lastTeam;
      if (scorer) add("goal", scorer, st.start, st.end, null, `Play restarts from the centre spot, ${where(spot)}`);
    }
    else if (thrower) add("throw", thrower.team, st.end, st.end, thrower.track_id, `Ball held up on the touchline, ${where(thrower.feet)}`);
    else if (st.exit && !exitGoalLine) {
      // Seen going over a touchline: a throw to the team that did not touch it last.
      add("throw", lastTeam ? other(lastTeam) : taker?.team ?? null, st.end, st.end, null, `Ball out over a touchline at ${where(st.exit)}`);
    } else if (st.exit) {
      // Seen going over a goal line: that end decides, wherever the ball is next seen.
      const d = defending(st.exit), sameEnd = spot && endLow(spot) === endLow(st.exit);
      if (sameEnd && atCorner) add("corner", other(d), st.end, st.end, at(atCorner), `Ball at the corner flag, ${where(spot)}`);
      else if (sameEnd && byGoal) add("goal_kick", d, st.end, st.end, at(byGoal), `Ball by the goal, ${where(spot)}`);
      else if (lastTeam === d) add("corner", other(d), st.end, st.end, null, `Defenders touched it last over their goal line at ${where(st.exit)}`);
      else add("goal_kick", d, st.end, st.end, null, `Attackers touched it last over the goal line at ${where(st.exit)}`);
    }
    else if (atCorner) add("corner", other(defending(spot)), st.end, st.end, taker?.track ?? null, `Ball at the corner flag, ${where(spot)}`);
    else if (byGoal) add("goal_kick", defending(spot), st.end, st.end, taker?.track ?? null, `Ball by the goal, ${where(spot)}`);
    else if (onTouch) add("throw", taker?.team ?? (lastTeam ? other(lastTeam) : null), st.end, st.end, taker?.track ?? null, `Ball on the touchline, ${where(spot)}`);
    else if (spot) add("free_kick", taker?.team ?? next, st.end, st.end, taker?.track ?? null, `Play restarts from ${where(spot)}`);
    else if (next) add("free_kick", next, st.end, st.end, null, "Play restarts out of sight");
  }

  // 7. Quick throws: play barely stops, but a player holds the ball up on a touchline.
  const covered = (t: number) => stoppages.some(st => t >= st.start && t <= st.end + p.restart_after_s);
  let group: (Held & { team: Team; feet: PitchPoint })[] = [];
  const flushThrow = () => {
    const last = group[group.length - 1];
    if (last && p.quick_throw_holds > 0 && group.length >= p.quick_throw_holds && !tags.some(t => t.type === "throw" && Math.abs(t.time_s - last.time_s) < p.throw_gap_s))
      add("throw", last.team, last.time_s, last.time_s, last.track_id, `Ball held up on the touchline, ${where(last.feet)}`);
    group = [];
  };
  for (const h of [...held].sort((a, b) => a.time_s - b.time_s)) {
    if (covered(h.time_s)) continue;
    const who = teamAt(h.track_id, h.time_s), feet = pointAt(paths.get(h.track_id) ?? [], h.time_s, 1);
    if (!playing(who) || who.role === "goalkeeper" || !feet || Math.min(feet.y, w - feet.y) > p.held_touch_m) continue;
    const last = group[group.length - 1];
    if (last && (last.track_id !== h.track_id || h.time_s - last.time_s > 1.5)) flushThrow();
    group.push({ ...h, team: who.team, feet });
  }
  flushThrow();

  const seen = new Set<string>();
  return tags.filter(t => !seen.has(t.id) && (seen.add(t.id), true)).sort((a, b) => a.time_s - b.time_s || a.type.localeCompare(b.type));
}
