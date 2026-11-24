import { expect, it } from "vitest";
import { inPlay, mergeDense } from "./playArea";
import type { Assignment, Observation } from "./labTypes";

const at = (track_id: number, time_s: number, x: number, y: number, h = 0.1): Observation =>
  ({ track_id, time_s, team_id: null, role: "unknown", image_box: [x - 0.01, y - h, x + 0.01, y] });
const you = (team: "own" | "opponent" | null, role: Assignment["role"] = "player"): Assignment => ({ team, role, source: "you", confidence: 1 });
const suggested = (team: "own" | "opponent"): Assignment => ({ team, role: "player", source: "similar", confidence: 0.6 });

it("inside a moment clip the refined positions replace the sampled ones; elsewhere nothing changes", () => {
  const sampled = [at(1, 1, 0.5, 0.5), at(1, 5, 0.5, 0.5), at(1, 9, 0.5, 0.5)];
  const dense = { windows: [{ start_s: 4, end_s: 6 }], observations: [{ track_id: 1, time_s: 4.1, image_box: [0.1, 0.1, 0.2, 0.3], linked: true }] };
  const merged = mergeDense(sampled, dense);
  expect(merged.map(o => o.time_s)).toEqual([1, 4.1, 9]);
  expect(merged[1].image_box).toEqual([0.1, 0.1, 0.2, 0.3]);
});

const teams = new Map<number, Assignment>([[1, you("own")], [2, you("own")], [3, you("opponent")], [9, you(null, "other")]]);
const players = [at(1, 0, 0.3, 0.6), at(2, 0, 0.6, 0.8), at(3, 0, 0.5, 0.5)];

it("leaves out people standing well beyond the furthest labelled player, like spectators at the far fence", () => {
  const spectator = at(4, 0, 0.5, 0.3, 0.04);
  expect(inPlay([...players, spectator], teams, null).map(o => o.track_id)).toEqual([1, 2, 3]);
});

it("keeps unlabelled players nearer the camera or off to the side of the labelled ones", () => {
  const near = at(5, 0, 0.9, 0.95, 0.2), side = at(6, 0, 0.02, 0.52, 0.08);
  expect(inPlay([...players, near, side], teams, null).map(o => o.track_id)).toEqual([1, 2, 3, 5, 6]);
});

it("always keeps the selected person and your labelled people, wherever they stand", () => {
  const far = at(7, 0, 0.95, 0.1, 0.04), farLabelled = at(1, 0, 0.02, 0.2, 0.04);
  expect(inPlay([farLabelled, players[1], players[2], far], teams, 7).map(o => o.track_id)).toEqual([1, 2, 3, 7]);
});

it("one suggested spectator cannot move the far edge when you have labelled too few on screen", () => {
  const few = new Map<number, Assignment>([[1, suggested("own")], [2, suggested("own")], [3, suggested("opponent")], [4, suggested("own")]]);
  const wrong = at(4, 0, 0.5, 0.2, 0.04), beyond = at(5, 0, 0.6, 0.25, 0.04);
  expect(inPlay([...players, wrong, beyond], few, null).map(o => o.track_id)).toEqual([1, 2, 3]);
});

it("with too few people given a team shows everyone except those marked not players", () => {
  const few = [players[0], at(4, 0, 0.5, 0.15), at(9, 0, 0.7, 0.7)];
  expect(inPlay(few, teams, null).map(o => o.track_id)).toEqual([1, 4]);
});

const kit = (team: "own" | "opponent"): Assignment => ({ team, role: "player", source: "kit", confidence: 0.9 });
it("player-sized people matched by kit set the far edge like your labels; tiny kit matches on pitches beyond do not", () => {
  const matched = new Map<number, Assignment>([[1, kit("own")], [2, kit("opponent")], [3, kit("own")], [4, kit("opponent")], [5, kit("opponent")]]);
  const farPlayer = at(3, 0, 0.5, 0.4, 0.1);           // a real player near the far touchline
  const close = [at(1, 0, 0.3, 0.7, 0.12), at(2, 0, 0.6, 0.8, 0.13)];
  const tinyBeyond = [at(4, 0, 0.4, 0.25, 0.03), at(5, 0, 0.45, 0.26, 0.03)]; // red kids on another pitch
  expect(inPlay([...close, farPlayer, ...tinyBeyond], matched, null).map(o => o.track_id)).toEqual([1, 2, 3]);
});
