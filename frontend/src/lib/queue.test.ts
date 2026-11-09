import { describe, expect, it } from "vitest";
import { moveItem, removeAt } from "./queue";

describe("moveItem", () => {
  it("moves an item down", () => expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]));
  it("moves an item up", () => expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]));
  it("is a no-op past either end", () => {
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, 2)).toEqual(["a", "b"]);
  });
  it("never mutates the input", () => {
    const input = ["a", "b"];
    moveItem(input, 0, 1);
    expect(input).toEqual(["a", "b"]);
  });
});

describe("removeAt", () => {
  it("removes one item and keeps the current index on the same clip", () => {
    expect(removeAt(["a", "b", "c"], 0, 2)).toEqual({ items: ["b", "c"], current: 1 });
  });
  it("keeps the current index when removing after it", () => {
    expect(removeAt(["a", "b", "c"], 2, 0)).toEqual({ items: ["a", "b"], current: 0 });
  });
  it("clamps when removing the current last item", () => {
    expect(removeAt(["a", "b"], 1, 1)).toEqual({ items: ["a"], current: 0 });
  });
});
