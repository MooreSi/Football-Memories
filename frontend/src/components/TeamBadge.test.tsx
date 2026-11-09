import { describe, expect, it } from "vitest";
import { initials } from "./TeamBadge";

describe("initials", () => {
  it("skips age-group words, so 'Riverside U12' becomes R", () => expect(initials("Riverside U12")).toBe("R"));
  it("takes the first letters of the first two words", () => expect(initials("Rovers Athletic FC")).toBe("RA"));
  it("ignores punctuation", () => expect(initials("St. Mary's")).toBe("SM"));
});
