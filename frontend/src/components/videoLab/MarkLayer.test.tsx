import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { MarkLayer } from "./MarkLayer";
import type { Corners } from "./pitch";

const corners: Corners = [[0.1, 0.9], [0.9, 0.9], [0.7, 0.3], [0.3, 0.3]];
const ends = [{ name: "Near halfway intersection", pitch: [0.5, 0] as [number, number], image: [0.5, 0.9] as [number, number] }, { name: "Far halfway intersection", pitch: [0.5, 1] as [number, number], image: [0.5, 0.3] as [number, number] }];

it("draws the halfway line between the two halfway handles while you mark the pitch", () => {
  render(<MarkLayer corners={corners} onChange={() => undefined} landmarks={ends} onLandmarks={() => undefined} />);
  const line = screen.getByLabelText("Halfway line being marked");
  expect(line.getAttribute("x1")).toBe("0.5");
  expect(line.getAttribute("y1")).toBe("0.9");
  expect(line.getAttribute("y2")).toBe("0.3");
});

it("draws no halfway line without both halfway handles", () => {
  render(<MarkLayer corners={corners} onChange={() => undefined} landmarks={ends.slice(0, 1)} onLandmarks={() => undefined} />);
  expect(screen.queryByLabelText("Halfway line being marked")).toBeNull();
});

it("draws a penalty box through its four handles", () => {
  const box = ["Left box, near goal-line end", "Left box, near front corner", "Left box, far front corner", "Left box, far goal-line end"].map((name, i) => ({ name, pitch: [0, 0] as [number, number], image: [[0.1, 0.8], [0.3, 0.75], [0.35, 0.5], [0.15, 0.45]][i] as [number, number] }));
  render(<MarkLayer corners={corners} onChange={() => undefined} landmarks={box} onLandmarks={() => undefined} />);
  expect(screen.getByLabelText("Left penalty box being marked").getAttribute("points")).toBe("0.1,0.8 0.3,0.75 0.35,0.5 0.15,0.45");
  expect(screen.queryByLabelText("Right penalty box being marked")).toBeNull();
});
