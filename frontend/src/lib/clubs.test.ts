import { expect, it } from "vitest";
import { resolveClub } from "./clubs";

// Owner report 2026-11-15: "AFC Birmingham" (a grassroots side) showed as Birmingham City.
it("keeps a club written with AFC apart from the professional club of the same town", () => {
  expect(resolveClub("AFC Birmingham")).toBe("AFC Birmingham");
  expect(resolveClub("Birmingham")).toBe("Birmingham City"); // negative control
  expect(resolveClub("AFC Bournemouth")).toBe("AFC Bournemouth");
  expect(resolveClub("Bournemouth")).toBe("AFC Bournemouth");
});
