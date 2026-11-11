import { expect, it } from "vitest";
import { autoCheck } from "./hudlAutoCheck";

const now = 1_800_000_000_000;
const ready = { state: "ready", message: "", busy: false, configured: true, catalogue_checked_at: now / 1000 - 60 };
// Fully indexed now also means a full-quality snapshot exists (owner report 2026-11-11).
const indexed = [{ id: "a", title: "A", age_group: "U11", capture_key: "k", tag_status: "synced" as const, poster_url: "http://127.0.0.1:8766/account/match/a/poster" }];

it("looks for new matches on opening the app when the list is older than six hours", () => {
  expect(autoCheck({ ...ready, catalogue_checked_at: now / 1000 - 7 * 3600 }, indexed, now)).toBe("refresh");
  expect(autoCheck({ ...ready, catalogue_checked_at: null }, [], now)).toBe("refresh");
});

it("records tags for matches that were never indexed", () => {
  expect(autoCheck(ready, [...indexed, { id: "b", title: "B", age_group: "U11", capture_key: "j" }], now)).toBe("sync_tags");
  expect(autoCheck(ready, indexed, now)).toBeNull();
});

it("never starts while unconfigured, busy or already indexing", () => {
  expect(autoCheck({ ...ready, configured: false, catalogue_checked_at: null }, [], now)).toBeNull();
  expect(autoCheck({ ...ready, busy: true, catalogue_checked_at: null }, [], now)).toBeNull();
  expect(autoCheck({ ...ready, busy: true, syncing: true, catalogue_checked_at: null }, [], now)).toBeNull();
});

it("starts the sweep when indexed matches still lack a full-quality snapshot", () => {
  const status = { configured: true, busy: false, state: "ready", message: "", catalogue_checked_at: Date.now() / 1000 } as never;
  const base = { title: "x", age_group: "U11", capture_key: "k", tag_status: "synced" as const, moments: [] };
  expect(autoCheck(status, [{ ...base, id: "a", poster_url: null }], Date.now())).toBe("sync_tags");
  expect(autoCheck(status, [{ ...base, id: "a", poster_url: "http://127.0.0.1:8766/account/match/a/poster" }], Date.now())).toBeNull();
  // Tried within the week (no stream for it): wait for the weekly retry.
  expect(autoCheck(status, [{ ...base, id: "a", poster_url: null, poster_checked_at: Date.now() / 1000 - 60 }], Date.now())).toBeNull();
  expect(autoCheck(status, [{ ...base, id: "a", poster_url: null, tag_status: "unavailable" }], Date.now())).toBeNull();
});
