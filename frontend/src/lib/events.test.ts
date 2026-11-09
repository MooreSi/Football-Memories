import { describe, expect, it } from "vitest";
import { clipWindow, filterEvents, nextEventIndex, previousEventIndex } from "./events";
import type { MatchEvent } from "../api/types";

const ev = (id: number, time_s: number, category: string, players: string[] = []): MatchEvent => ({
  id, time_s, duration_s: 0, category, players, note: "",
});

const events = [
  ev(1, 10, "Save", ["Sam"]),
  ev(2, 20, "Goal", ["Alex"]),
  ev(3, 30, "Save", ["Alex", "Sam"]),
  ev(4, 40, "Pass", []),
];

describe("filterEvents", () => {
  it("returns every event when no filter is set", () => {
    expect(filterEvents(events, { categories: [], players: [], mode: "or" }).map((e) => e.id))
      .toEqual([1, 2, 3, 4]);
  });

  it("OR mode keeps events matching any selected category or player", () => {
    const out = filterEvents(events, { categories: ["Goal"], players: ["Sam"], mode: "or" });
    expect(out.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it("AND mode keeps events matching a selected category and every selected player", () => {
    const out = filterEvents(events, { categories: ["Save"], players: ["Alex", "Sam"], mode: "and" });
    expect(out.map((e) => e.id)).toEqual([3]);
  });

  it("AND mode with players only requires all of them on the event", () => {
    const out = filterEvents(events, { categories: [], players: ["Alex"], mode: "and" });
    expect(out.map((e) => e.id)).toEqual([2, 3]);
  });
});

describe("clipWindow", () => {
  it("starts before and ends after the event by the buffers (brief: 15:32 -> -8s / +5s)", () => {
    expect(clipWindow(ev(1, 932, "Save"), { pre: 8, post: 5 }, 5400)).toEqual({ start: 924, end: 937 });
  });

  it("extends the end by the event's own duration", () => {
    const e = { ...ev(1, 100, "Run"), duration_s: 6 };
    expect(clipWindow(e, { pre: 8, post: 5 }, 5400)).toEqual({ start: 92, end: 111 });
  });

  it("clamps at the start of the match", () => {
    expect(clipWindow(ev(1, 3, "Save"), { pre: 8, post: 5 }, 5400)).toEqual({ start: 0, end: 8 });
  });

  it("clamps at the end of the match", () => {
    expect(clipWindow(ev(1, 5398, "Save"), { pre: 8, post: 5 }, 5400)).toEqual({ start: 5390, end: 5400 });
  });
});

describe("next / previous event", () => {
  it("finds the next event strictly after the current time", () => {
    expect(nextEventIndex(events, 10)).toBe(1);
    expect(nextEventIndex(events, 40)).toBe(-1);
  });

  it("finds the previous event, ignoring one that just started (1.5s grace)", () => {
    expect(previousEventIndex(events, 31)).toBe(1);
    expect(previousEventIndex(events, 35)).toBe(2);
    expect(previousEventIndex(events, 5)).toBe(-1);
  });
});
