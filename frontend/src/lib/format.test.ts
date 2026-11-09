import { describe, expect, it } from "vitest";
import { formatBytes, formatClock } from "./format";

describe("formatClock", () => {
  it("formats minutes and seconds under an hour", () => expect(formatClock(932.7)).toBe("15:32"));
  it("formats hours when needed", () => expect(formatClock(3723)).toBe("1:02:03"));
  it("treats invalid input as zero", () => expect(formatClock(Number.NaN)).toBe("0:00"));
});

describe("formatBytes", () => {
  it("uses binary units with one decimal", () => expect(formatBytes(1536 * 1024 * 1024)).toBe("1.5 GB"));
  it("keeps small values in bytes", () => expect(formatBytes(512)).toBe("512 B"));
});
