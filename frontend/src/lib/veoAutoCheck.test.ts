import { expect, it } from "vitest";
import { veoAutoCheck } from "./veoAutoCheck";

// Owner request 2026-11-15: new Veo matches appear in the library without pressing
// Refresh, at most every six hours (as Hudl, owner decision 003).
const now = 1_800_000_000_000;
const ready = { configured: true, busy: false, state: "ready", message: "", summary: null, library_checked_at: now / 1000 - 60 };
const hours = (n: number) => now - n * 3600 * 1000;

it("refreshes when the Veo list is older than six hours or was never read", () => {
  expect(veoAutoCheck({ ...ready, library_checked_at: hours(7) / 1000 }, null, now)).toBe(true);
  expect(veoAutoCheck({ ...ready, library_checked_at: null }, null, now)).toBe(true);
  expect(veoAutoCheck(ready, null, now)).toBe(false);
});

it("never starts while unconfigured or busy", () => {
  expect(veoAutoCheck({ ...ready, configured: false, library_checked_at: null }, null, now)).toBe(false);
  expect(veoAutoCheck({ ...ready, busy: true, library_checked_at: null }, null, now)).toBe(false);
  expect(veoAutoCheck(undefined, null, now)).toBe(false);
});

it("does not try again within six hours of the last try, even if it failed", () => {
  const stale = { ...ready, library_checked_at: null };
  expect(veoAutoCheck(stale, hours(1), now)).toBe(false);
  expect(veoAutoCheck(stale, hours(7), now)).toBe(true);
});
