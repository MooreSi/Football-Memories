import { describe, expect, it } from "vitest";
import { cleanAnchors, kitTimeline, learnKits, rememberKits, kitColour, type KitObservation } from "./kits";
import type { Assignment, TrackLabel } from "./labTypes";

// OpenCV Lab (0-255, a*/b* centred on 128), as the worker writes colour_lab.
const YELLOW = [105, 153, 173], RED = [80, 177, 160], PINK = [116, 192, 130], BLACK = [9, 128, 125], BEIGE = [150, 132, 140];
const row = (track_id: number, time_s: number, colour_lab: number[] | null): KitObservation =>
  ({ track_id, time_s, team_id: null, role: "unknown", image_box: [0.4, 0.4, 0.42, 0.5], colour_lab });
const run = (track_id: number, from: number, to: number, colour: number[]) => {
  const out: KitObservation[] = [];
  for (let t = from; t <= to + 1e-9; t += 1 / 3) out.push(row(track_id, Math.round(t * 1000) / 1000, colour));
  return out;
};
const none = new Map<number, Assignment>();
const labels: TrackLabel[] = [
  { track_id: 1, team: "own", role: "player" }, { track_id: 2, team: "opponent", role: "player" },
  { track_id: 3, team: "opponent", role: "goalkeeper" }, { track_id: 4, team: null, role: "referee" },
];
const labelled = [...run(1, 0, 4, YELLOW), ...run(2, 0, 4, RED), ...run(3, 0, 4, PINK), ...run(4, 0, 4, BLACK)];

describe("cleanAnchors", () => {
  it("drops views of a labelled person that show a different known kit, so they cannot teach the wrong label", () => {
    const kits = learnKits(labelled, labels);
    const tracks = [{ track_id: 1, group: 0, start_s: 0, end_s: 4, thumb: 0, v: [1, 0], views: [{ v: [1, 0], kit: YELLOW }, { v: [0, 1], kit: BLACK }] },
      { track_id: 9, group: 0, start_s: 0, end_s: 4, thumb: 0, v: [0, 1], views: [{ v: [0, 1], kit: BLACK }] }];
    const cleaned = cleanAnchors(tracks, labels, kits);
    expect(cleaned[0].views).toEqual([{ v: [1, 0], kit: YELLOW }]);
    expect(cleaned[1]).toBe(tracks[1]);
  });
  it("leaves only an unlabelled person's dark views to the appearance model; their coloured views are decided by kit", () => {
    const kits = learnKits(labelled, labels);
    const mixed = { track_id: 9, group: 0, start_s: 0, end_s: 4, thumb: 0, v: [0, 1], views: [{ v: [0, 1], kit: BLACK }, { v: [1, 0], kit: RED }] };
    const allColour = { ...mixed, track_id: 8, views: [{ v: [1, 0], kit: RED }] };
    const [a, b] = cleanAnchors([mixed, allColour], labels, kits);
    expect(a.views).toEqual([{ v: [0, 1], kit: BLACK }]);
    expect(b).toBe(allColour);
  });
});

describe("learnKits", () => {
  it("learns each labelled kit from the shirt seen most, not from shorts or a tracker switch", () => {
    const noisy = [...labelled, ...run(1, 5, 6, BLACK), ...run(2, 5, 6, YELLOW)];
    const kits = learnKits(noisy, labels);
    const own = kits.find(k => k.team === "own" && k.role === "player")!;
    const opponent = kits.find(k => k.team === "opponent" && k.role === "player")!;
    expect(own.lab[1]).toBeCloseTo(YELLOW[1], 0); expect(own.lab[2]).toBeCloseTo(YELLOW[2], 0);
    expect(opponent.lab[1]).toBeCloseTo(RED[1], 0); expect(opponent.lab[2]).toBeCloseTo(RED[2], 0);
  });
  it("learns a kit seen in sun and in shadow as two shades of the same kit", () => {
    const SUN = [190, 150, 175], SHADE = [70, 160, 150];
    const rows = [...run(1, 0, 4, SUN), ...run(1, 4.33, 8, SHADE), ...run(2, 0, 8, [80, 128, 200])];
    const kits = learnKits(rows, [{ track_id: 1, team: "own", role: "player" }, { track_id: 2, team: "opponent", role: "player" }]);
    expect(kits.filter(k => k.team === "own")).toHaveLength(2);
    const teams = kitTimeline([...rows, ...run(9, 20, 22, [72, 161, 151]), ...run(10, 20, 22, [188, 151, 174])], kits, [{ track_id: 1, team: "own", role: "player" }, { track_id: 2, team: "opponent", role: "player" }], none);
    expect(teams.at(9, 21)).toMatchObject({ team: "own", source: "kit" });
    expect(teams.at(10, 21)).toMatchObject({ team: "own", source: "kit" });
    expect(teams.at(1, 6)).toMatchObject({ team: "own", source: "you" });
  });
  it("a passing minority colour on a labelled player is not learned as a second shade", () => {
    const rows = [...run(1, 0, 8, YELLOW), ...run(1, 8.33, 8.7, BLACK)];
    expect(learnKits(rows, [{ track_id: 1, team: "own", role: "player" }])).toHaveLength(1);
  });
  it("learns nothing without your labels or remembered kits", () => {
    expect(learnKits(labelled, [])).toEqual([]);
  });
});

describe("kitTimeline", () => {
  const kits = learnKits(labelled, labels);
  it("puts an unlabelled player in a learned kit on that team for the whole clip", () => {
    const rows = [...labelled, ...run(10, 20, 30, [100, 151, 170]), ...run(11, 20, 30, [84, 179, 158])];
    const teams = kitTimeline(rows, kits, labels, none);
    expect(teams.at(10, 25)).toMatchObject({ team: "own", role: "player", source: "kit" });
    expect(teams.at(11, 21)).toMatchObject({ team: "opponent", role: "player", source: "kit" });
    expect(teams.tracks.get(10)).toMatchObject({ team: "own", source: "kit" });
  });
  it("follows the kit when the tracker swaps your labelled player for someone in the other kit", () => {
    const rows = [...labelled, ...run(20, 10, 14, RED), ...run(20, 14.33, 20, YELLOW)];
    const teams = kitTimeline(rows, kits, [...labels, { track_id: 20, team: "opponent", role: "player" }], none);
    expect(teams.at(20, 11)).toMatchObject({ team: "opponent", source: "you" });
    expect(teams.at(20, 18)).toMatchObject({ team: "own", source: "kit" });
  });
  it("one odd frame does not flip a player", () => {
    const rows = [...labelled, ...run(21, 10, 12, YELLOW), row(21, 12.333, RED), ...run(21, 12.667, 15, YELLOW)];
    const teams = kitTimeline(rows, kits, labels, none);
    expect(teams.at(21, 12.333)).toMatchObject({ team: "own" });
  });
  it("recognises the opposition keeper's pink kit", () => {
    const teams = kitTimeline([...labelled, ...run(22, 10, 12, [118, 190, 131])], kits, labels, none);
    expect(teams.at(22, 11)).toMatchObject({ team: "opponent", role: "goalkeeper", source: "kit" });
  });
  it("dark kits alone never decide a team: an unlabelled person in black keeps the other evidence", () => {
    const fallback = new Map<number, Assignment>([[30, { team: null, role: null, source: "none", confidence: 0 }]]);
    const withKeeper = [...labels, { track_id: 5, team: "own", role: "goalkeeper" } as TrackLabel];
    const keeperKits = learnKits([...labelled, ...run(5, 0, 4, [12, 126, 127])], withKeeper);
    const teams = kitTimeline([...labelled, ...run(30, 10, 12, BLACK)], keeperKits, withKeeper, fallback);
    expect(teams.at(30, 11)).toMatchObject({ team: null, source: "none" });
  });
  it("your label on a referee holds; colours matching no kit leave a person to the other evidence", () => {
    const teams = kitTimeline([...labelled, ...run(31, 10, 12, BEIGE)], kits, labels, none);
    expect(teams.at(4, 2)).toMatchObject({ role: "referee", source: "you" });
    expect(teams.at(31, 11)).toBeUndefined();
  });
  it("your team label does not follow the tracker onto the referee in black", () => {
    const fallback = new Map<number, Assignment>([[50, { team: null, role: "referee", source: "similar", confidence: 0.7 }]]);
    const rows = [...labelled, ...run(50, 10, 13, RED), ...run(50, 13.33, 20, BLACK)];
    const teams = kitTimeline(rows, kits, [...labels, { track_id: 50, team: "opponent", role: "player" }], fallback);
    expect(teams.at(50, 11)).toMatchObject({ team: "opponent", source: "you" });
    expect(teams.at(50, 18)).toMatchObject({ role: "referee", source: "similar" });
  });
  it("where your label is contradicted and the other evidence is only your label again, the person stays unassigned", () => {
    const fallback = new Map<number, Assignment>([[51, { team: "opponent", role: "player", source: "you", confidence: 1 }]]);
    const rows = [...labelled, ...run(51, 10, 13, RED), ...run(51, 13.33, 20, BLACK)];
    const teams = kitTimeline(rows, kits, [...labels, { track_id: 51, team: "opponent", role: "player" }], fallback);
    expect(teams.at(51, 18)).toBeUndefined();
  });
  it("the stretch after a tracker swap gets the appearance model's own judgement, kept apart from your label", () => {
    const kitsHere = learnKits(labelled, labels);
    const swapped = { track_id: 52, group: 0, start_s: 10, end_s: 20, thumb: 0, v: [1, 0], views: [{ v: [1, 0], kit: RED }, { v: [0, 1], kit: BLACK }] };
    const withSwap = [...labels, { track_id: 52, team: "opponent", role: "player" } as TrackLabel];
    const prepared = cleanAnchors([swapped], withSwap, kitsHere);
    expect(prepared.find(t => t.track_id === -52)?.views).toEqual([{ v: [0, 1], kit: BLACK }]);
    const fallback = new Map<number, Assignment>([[52, { team: "opponent", role: "player", source: "you", confidence: 1 }], [-52, { team: null, role: "referee", source: "similar", confidence: 0.8 }]]);
    const teams = kitTimeline([...labelled, ...run(52, 10, 13, RED), ...run(52, 13.33, 20, BLACK)], kitsHere, withSwap, fallback);
    expect(teams.at(52, 18)).toMatchObject({ role: "referee", source: "similar" });
    expect(teams.tracks.has(-52)).toBe(false);
  });
  it("only one referee and one keeper per team at a moment: your label wins, then the strongest suggestion", () => {
    const ref = (confidence: number): Assignment => ({ team: null, role: "referee", source: "similar", confidence });
    const fallback = new Map<number, Assignment>([[60, ref(0.7)], [61, ref(0.9)], [62, ref(0.8)]]);
    const rows = [...labelled, ...run(60, 10, 11, BLACK), ...run(61, 10, 11, BLACK), ...run(62, 20, 21, BLACK), ...run(4, 20, 21, BLACK)];
    const teams = kitTimeline(rows, kits, labels, fallback);
    expect(teams.at(61, 10.5)).toMatchObject({ role: "referee" });
    expect(teams.at(60, 10.5)).toBeUndefined();
    expect(teams.at(4, 20.5)).toMatchObject({ role: "referee", source: "you" });
    expect(teams.at(62, 20.5)).toBeUndefined();
  });
  it("kits remembered from earlier matches recognise your team before you label anyone here", () => {
    const remembered = learnKits(labelled, labels).filter(k => k.team === "own");
    const kitsNow = learnKits([], [], remembered);
    const teams = kitTimeline(run(40, 0, 3, YELLOW), kitsNow, [], none);
    expect(teams.at(40, 1)).toMatchObject({ team: "own", source: "kit" });
  });
  it("this match's labels replace a remembered kit for the same team (an away kit)", () => {
    const remembered = learnKits(labelled, labels).filter(k => k.team === "own");
    const away = [...run(1, 0, 4, [60, 120, 90]), ...run(2, 0, 4, RED)];
    const kitsNow = learnKits(away, labels.slice(0, 2), remembered);
    const teams = kitTimeline([...away, ...run(41, 5, 7, YELLOW), ...run(42, 5, 7, [62, 121, 92])], kitsNow, labels.slice(0, 2), none);
    expect(teams.at(41, 6)).toBeUndefined();
    expect(teams.at(42, 6)).toMatchObject({ team: "own", source: "kit" });
  });
});

describe("rememberKits", () => {
  const views = (kit: number[], n = 4) => Array.from({ length: n }, () => ({ v: [1, 0], kit }));
  const model = (title: string) => ({ title, examples: [
    { track_id: 1, team: "own" as const, role: "player" as const, views: views(YELLOW) },
    { track_id: 2, team: "opponent" as const, role: "player" as const, views: views(RED) },
  ] });
  it("another window of the same match remembers every kit you taught", () => {
    const kits = rememberKits([model("261107 RCW vs Kidderminster CG")], "261107 RCW vs Kidderminster CG");
    expect(kits.map(k => k.team).sort()).toEqual(["opponent", "own"]);
  });
  it("another match of a club in the title remembers only your team's kit", () => {
    const kits = rememberKits([model("261031 Redditch vs RCW")], "261107 RCW vs Kidderminster CG");
    expect(kits).toHaveLength(1);
    expect(kits[0]).toMatchObject({ team: "own", role: "player" });
    expect(kits[0].lab[1]).toBeCloseTo(YELLOW[1], 0);
  });
  it("a club written as its initials in one title and in full in another is the same club", () => {
    const kits = rememberKits([model("261107 RCW vs Kidderminster CG")], "Racing Club Warwick vs Kidderminster RMC · 16 Nov 2026 · 18:00–28:00");
    expect(kits).toHaveLength(1);
    expect(kits[0]).toMatchObject({ team: "own" });
  });
  it("a shared place name alone does not make two different clubs the same", () => {
    expect(rememberKits([model("Kidderminster CG vs Redditch")], "Racing Club Warwick vs Kidderminster RMC")).toEqual([]);
  });
  it("unrelated or untitled runs teach nothing", () => {
    expect(rememberKits([model("Villa vs Stoke"), model("")], "261107 RCW vs Kidderminster CG")).toEqual([]);
    expect(rememberKits([model("RCW vs X")], "")).toEqual([]);
  });
});

describe("kitColour", () => {
  it("turns the worker's Lab colour into a swatch colour", () => {
    expect(kitColour([255, 128, 128])).toBe("#ffffff");
    expect(kitColour([0, 128, 128])).toBe("#000000");
    const [r, g, b] = [1, 3, 5].map(i => parseInt(kitColour(RED).slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(2 * g); expect(r).toBeGreaterThan(2 * b);
  });
});
