import { describe, expect, it } from "vitest";
import { H, W, containRect, curveThrough, drawingFileName, drawingSvg, finish, frameNoteId, isFrameNote, marks, smoothPath, thin } from "./drawing";

describe("marks", () => {
  it("draws an arrow as a shaft that stops short of a head pointing at the end", () => {
    const [shaft, head] = marks({ kind: "arrow", x1: 0, y1: 0.5, x2: 0.5, y2: 0.5 });
    expect(shaft).toMatchObject({ tag: "line", attrs: { "data-shape": "arrow", x1: 0, y1: 450 } });
    expect(Number(shaft.attrs.x2)).toBeLessThan(800);
    expect(head.tag).toBe("polygon");
    const tip = String(head.attrs.points).split(" ")[0];
    expect(tip).toBe("800,450");
  });

  it("dashes a run, and its width follows the chosen size", () => {
    const thin1 = marks({ kind: "dashed", x1: 0, y1: 0, x2: 1, y2: 1, width: 1 })[0];
    const thick = marks({ kind: "dashed", x1: 0, y1: 0, x2: 1, y2: 1, width: 3 })[0];
    expect(thin1.attrs["stroke-dasharray"]).toBeTruthy();
    expect(Number(thick.attrs["stroke-width"])).toBeGreaterThan(Number(thin1.attrs["stroke-width"]));
  });

  it("bends a curved arrow through its control point", () => {
    const [path] = marks({ kind: "curve", x1: 0, y1: 1, x2: 1, y2: 1, cx: 0.5, cy: 0 });
    expect(path.attrs.d).toBe("M0 900 Q800 0 1600 900");
  });

  it("shades a zone the same whichever way it was dragged", () => {
    const a = marks({ kind: "zone", x1: 0.5, y1: 0.5, x2: 0.25, y2: 0.25 })[0];
    expect(a.attrs).toMatchObject({ x: 400, y: 225, width: 400, height: 225 });
  });

  it("puts a spotlight ring on the ground around its centre", () => {
    const [ring] = marks({ kind: "spotlight", x1: 0.5, y1: 0.5, x2: 0.6, y2: 0.5 });
    expect(ring).toMatchObject({ tag: "ellipse", attrs: { cx: 800, cy: 450, rx: 160 } });
    expect(Number(ring.attrs.ry)).toBeLessThan(160);
  });

  it("writes labels and player markers with their text", () => {
    const label = marks({ kind: "text", x1: 0.1, y1: 0.1, x2: 0.1, y2: 0.1, label: "Press" });
    expect(label.find((m) => m.tag === "text")?.text).toBe("Press");
    const marker = marks({ kind: "marker", x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, label: "7" });
    expect(marker.map((m) => m.tag)).toEqual(["circle", "text"]);
  });
});

it("smooths a pen stroke through the midpoints of what was drawn", () => {
  expect(smoothPath([[0, 0], [0.5, 0], [1, 1]])).toBe("M0 0 Q800 0 1200 450 L1600 900");
});

it("thins a long pen stroke to what the backend keeps, keeping both ends", () => {
  const long = Array.from({ length: 1000 }, (_, i) => [i / 999, 0.5] as [number, number]);
  const out = thin(long, 400);
  expect(out.length).toBeLessThanOrEqual(400);
  expect(out[0]).toEqual(long[0]);
  expect(out.at(-1)).toEqual(long.at(-1));
});

it("bends the curve so it passes through the furthest point of the swoop", () => {
  const c = curveThrough(0, 1, 1, 1, [[0.25, 0.75], [0.5, 0.5], [0.75, 0.75]]);
  expect(c).toEqual({ cx: 0.5, cy: 0 });
});

describe("finish", () => {
  it("drops a click that drew nothing, but keeps a text or marker click", () => {
    expect(finish({ kind: "arrow", x1: 0.5, y1: 0.5, x2: 0.505, y2: 0.5 })).toBeNull();
    expect(finish({ kind: "pen", x1: 0, y1: 0, x2: 0, y2: 0, points: [[0, 0]] })).toBeNull();
    expect(finish({ kind: "marker", x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.5, label: "1" })).not.toBeNull();
  });
});

it("escapes label text in the exported picture", () => {
  const svg = drawingSvg([{ kind: "text", x1: 0.1, y1: 0.1, x2: 0.1, y2: 0.1, label: "<b>&" }]);
  expect(svg).toContain("&lt;b&gt;&amp;");
  expect(svg).not.toContain("<b>");
  expect(svg).toContain(`viewBox="0 0 ${W} ${H}"`);
});

it("keys a drawing on any frame by match and time, and leaves moment notes alone", () => {
  expect(frameNoteId("abc", 61.26)).toBe("frame:abc:61.3");
  expect(isFrameNote({ moment_id: "frame:abc:61.3" })).toBe(true);
  expect(isFrameNote({ moment_id: "s1" })).toBe(false);
});

it("names the screenshot after the match and minute, safe for any disk", () => {
  expect(drawingFileName("261101 U11 v Derby/County", 754.2)).toBe("261101 U11 v Derby-County 12-34 drawing.png");
});

it("letterboxes the frame the way the player shows it", () => {
  expect(containRect(1920, 1080, 1600, 900)).toEqual({ x: 0, y: 0, w: 1600, h: 900 });
  expect(containRect(1000, 1000, 1600, 900)).toEqual({ x: 350, y: 0, w: 900, h: 900 });
});
