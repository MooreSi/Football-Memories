import { expect, it } from "vitest";
import { veoExpiryQueue } from "./veoExpiryQueue";
import type { VeoMatch } from "../api/veo";
import type { DownloadEntry } from "../api/hudl";

// Spec 280: Veo deletes match video 6 or 12 months after the match; list what is not saved yet.
const today = new Date(2026, 10, 16);
const veo = (id: string, title: string, status: string, available = status !== "expired"): VeoMatch =>
  ({ id, source: "veo", title, age_group: "U11", available, expiration_status: status });
const saved = (id: string, kind: DownloadEntry["kind"] = "match") =>
  ({ kind, match_id: id, matches: [id], title: null, file: `${id}.mp4`, url: "", size: 1 }) as unknown as DownloadEntry;

it("estimates expiry from the match date and lists the soonest first", () => {
  const library = [veo("veo-b", "260301 NL v Coleshill", "does-not-expire-soon"), veo("veo-a", "251201 NL v Tamworth", "does-not-expire-soon")];
  const queue = veoExpiryQueue(library, [], 12, today);
  expect(queue.atRisk.map((r) => [r.match.id, r.daysLeft, r.band])).toEqual([["veo-a", 15, "30"], ["veo-b", 105, "later"]]);
  expect(queue.atRisk[0].expires).toEqual(new Date(2026, 11, 1));
});

it("a shorter retention brings the estimate forward, past due counts as the 7-day band", () => {
  const queue = veoExpiryQueue([veo("veo-a", "251201 NL v Tamworth", "does-not-expire-soon")], [], 6, today);
  expect(queue.atRisk[0].daysLeft).toBeLessThan(0);
  expect(queue.atRisk[0].band).toBe("7");
});

it("uses the 60-day band between 31 and 60 days", () => {
  const queue = veoExpiryQueue([veo("veo-a", "260101 NL v Tamworth", "does-not-expire-soon")], [], 12, today);
  expect([queue.atRisk[0].daysLeft, queue.atRisk[0].band]).toEqual([46, "60"]);
});

it("a full-match download is saved; a moments download is not", () => {
  const library = [veo("veo-a", "251201 NL v Tamworth", "expires-soon"), veo("veo-b", "251202 NL v Stafford", "expires-soon")];
  const queue = veoExpiryQueue(library, [saved("veo-a"), saved("veo-b", "moments")], 12, today);
  expect(queue.atRisk.map((r) => r.match.id)).toEqual(["veo-b"]);
  expect(queue.saved).toBe(1);
});

it("lists expired matches that were never saved as lost, newest first", () => {
  const library = [veo("veo-a", "241001 NL v Tamworth", "expired"), veo("veo-b", "241002 NL v Stafford", "expired"),
    veo("veo-d", "250105 NL v Rugby", "expired")];
  const queue = veoExpiryQueue(library, [saved("veo-b")], 12, today);
  expect(queue.lost.map((m) => m.id)).toEqual(["veo-d", "veo-a"]);
  expect(queue.atRisk).toEqual([]);
});

it("a match Veo has not expired but lists no video for is neither at risk nor lost", () => {
  const queue = veoExpiryQueue([veo("veo-c", "251010 NL v Leek", "does-not-expire-soon", false)], [], 12, today);
  expect(queue.atRisk).toEqual([]);
  expect(queue.lost).toEqual([]);
});

it("Veo's own expires-soon puts a match in the 30-day band at least", () => {
  const soon = veoExpiryQueue([veo("veo-a", "260801 NL v Tamworth", "expires-soon")], [], 12, today);
  const notSoon = veoExpiryQueue([veo("veo-a", "260801 NL v Tamworth", "does-not-expire-soon")], [], 12, today);
  expect(soon.atRisk[0].band).toBe("30");
  expect(notSoon.atRisk[0].band).toBe("later");
});

it("a match with no date in its title is listed last with an unknown band", () => {
  const library = [veo("veo-x", "Training game", "does-not-expire-soon"), veo("veo-a", "260801 NL v Tamworth", "does-not-expire-soon")];
  const queue = veoExpiryQueue(library, [], 12, today);
  expect(queue.atRisk.map((r) => [r.match.id, r.band, r.daysLeft])).toEqual([["veo-a", "later", 258], ["veo-x", "unknown", null]]);
});
