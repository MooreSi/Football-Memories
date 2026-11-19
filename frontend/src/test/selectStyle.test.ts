import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

/** Owner report 2026-11-19: Chrome drew its own light grey arrow and box on the pill
 *  dropdowns, unlike Safari. Every `select.field` draws the app's own chevron, and the
 *  page tells the browser it is dark so the opened list is dark too. (Read from disk:
 *  Vitest hands CSS imports back empty.) */
const css = readFileSync("src/index.css", "utf8"); // Vitest runs from frontend/
const rule = (selector: string) => {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at));
};

it("select.field drops the browser's own arrow and draws the app chevron", () => {
  const select = rule("select.field");
  expect(select).toMatch(/appearance:\s*none/);
  expect(select).toMatch(/-webkit-appearance:\s*none/);
  expect(select).toMatch(/background-image:\s*url\("data:image\/svg\+xml/);
  expect(select).toMatch(/padding-right:\s*2\.\d+rem/);
});

it("the page declares a dark colour scheme for native popups", () => {
  expect(rule(":root")).toMatch(/color-scheme:\s*dark/);
});
