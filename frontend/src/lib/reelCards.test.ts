import { expect, it } from "vitest";
import { THEMES, drawCard, matchCard } from "./reelCards";

it("auto-fills a match card with both clubs, the opponent and the UK date", () => {
  const card = matchCard("261108 U11 v Stoke (A)", "Aston Villa", { age: "U11", moments: 12 });
  expect(card).toMatchObject({ kind: "match", home: "Aston Villa", away: "Stoke City", title: "Aston Villa v Stoke City", date: "8 November 2026" });
  expect(card.detail).toContain("Away");
  expect(card.detail).toContain("12 moments");
});

it("keeps a non-fixture title as written, without a date", () => {
  const card = matchCard("Doku Combo 2", "Aston Villa");
  expect(card.title).toBe("Doku Combo 2");
  expect(card.away).toBeUndefined();
  expect(card.date).toBeUndefined();
});

it("offers at least six themes and draws nothing without a canvas", () => {
  expect(THEMES.length).toBeGreaterThanOrEqual(6);
  expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  expect(drawCard(null, { kind: "opening", title: "x" }, "gold", 0.5)).toBe(false);
});

/** A stand-in 2D context: records nothing, but throws on any call a real canvas would
 *  reject (non-finite numbers), so every theme's drawing code actually runs here. */
function fakeContext(): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = { font: "10px sans-serif" };
  const checkArgs = (name: string, args: unknown[]) => {
    for (const a of args) if (typeof a === "number" && !Number.isFinite(a)) throw new Error(`${name} got ${a}`);
  };
  const gradient = { addColorStop: (o: number, c: string) => { if (!(o >= 0 && o <= 1)) throw new Error(`stop ${o}`); if (!c) throw new Error("no colour"); } };
  return new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "measureText") return (s: string) => ({ width: s.length * (parseFloat(String(target.font).replace(/^\D*(\d)/, "$1")) || 10) * 0.55 });
      if (key === "canvas") return { width: 1920, height: 1080 };
      if (typeof key === "string" && /Gradient$/.test(key)) return (...args: unknown[]) => { checkArgs(key, args); return gradient; };
      if (key === "createPattern") return () => null;
      if (key === "getLineDash") return () => [];
      return (...args: unknown[]) => { checkArgs(String(key), args); };
    },
    set(target, key, value) { target[key] = value; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

it("adds broadcast-quality themes and a GTA 6 style theme", () => {
  const ids = THEMES.map((t) => t.id);
  for (const id of ["primetime", "studio", "starnight", "cinematic", "ledboard", "heist"]) expect(ids).toContain(id);
  expect(THEMES.filter((t) => t.group === "broadcast").length).toBeGreaterThanOrEqual(5);
  expect(THEMES.find((t) => t.id === "heist")?.blurb).toMatch(/GTA 6/);
});

it("draws every card kind on every theme through the whole animation", () => {
  const match = matchCard("261108 U11 v Stoke (A)", "Aston Villa", { age: "U11", moments: 4, score: { ours: 3, theirs: 1 } });
  const cards = [
    { kind: "opening" as const, title: "Season highlights", subtitle: "U11 · 2026" },
    { kind: "closing" as const, title: "Thanks for watching" },
    match,
    { kind: "stats" as const, title: "Team stats", subtitle: match.title, home: "Aston Villa", away: "Stoke City", stats: [{ label: "Shots", own: 9, opponent: 3 }] },
  ];
  for (const theme of THEMES) for (const card of cards) for (const t of [0, 0.1, 0.35, 0.6, 0.9, 1]) {
    expect(drawCard(fakeContext(), card, theme.id, t), `${theme.id} ${card.kind} at ${t}`).toBe(true);
  }
});
