import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { App } from "../App";

// Owner request 2026-11-13: a Veo card opens a full match page like a Hudl match
// (player, highlights rail, next moment, the stats Veo allows). Synthetic data only.
const H = "http://127.0.0.1:8766";
const match = {
  id: "veo-a", source: "veo", title: "261108 RJ vs Northgate CB", age_group: "U11", season_label: "2026/27",
  available: true, home_or_away: "home", duration_s: 3300, score: { ours: 2, theirs: 1 }, halves: [[0, 1500], [1800, 3300]],
  moments: [
    { id: "h1", category: "SHOT ON GOAL", time_s: 64, duration_s: 20, ai: true },
    { id: "h2", category: "GOAL", time_s: 300, duration_s: 20 },
    { id: "h3", category: "GOAL", time_s: 1900, duration_s: 20 },
  ],
};
const ready = { configured: true, busy: false, state: "ready", message: "Veo video ready.", summary: null, match_id: "veo-a", stream_url: `${H}/veo/stream/tok` };
const idle = { configured: true, busy: false, state: "ready", message: "", summary: null };
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

function stub(status: object) {
  return routes([match], status);
}

it("opens a Veo card's match on its own page with the player and highlights", async () => {
  stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  expect(await screen.findByRole("heading", { level: 1, name: /RJ vs Northgate CB/ })).toBeInTheDocument();
  expect(screen.getByText(/VEO MATCH/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Download full match/ })).toBeInTheDocument();
  const video = await screen.findByLabelText("Veo match video");
  expect(video).toHaveAttribute("src", `${H}/veo/stream/tok`);
  const rail = screen.getByRole("navigation", { name: "Highlight types" });
  expect(within(rail).getByRole("button", { name: /ALL HIGHLIGHTS\s*3/ })).toBeInTheDocument();
  expect(within(rail).getByRole("button", { name: /GOAL\s*2/ })).toBeInTheDocument();
});

it("filters the highlights by type from the rail", async () => {
  stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const rail = await screen.findByRole("navigation", { name: "Highlight types" });
  await userEvent.setup().click(within(rail).getByRole("button", { name: /GOAL\s*2/ }));
  const list = screen.getByRole("list", { name: "Veo highlights" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
});

it("shows the match stats Veo allows, and says they count both teams", async () => {
  stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const stats = await screen.findByRole("region", { name: "Match insights" });
  expect(within(stats).getByText("Goals tagged").closest("div")).toHaveTextContent("2");
  expect(within(stats).getByText("Shots on goal").closest("div")).toHaveTextContent("1");
  expect(within(stats).getByText("First goal").closest("div")).toHaveTextContent("5:00");
  expect(within(stats).getByText(/both teams/)).toBeInTheDocument();
  expect(within(stats).getByRole("group", { name: "Highlights by 5 minutes" })).toBeInTheDocument();
});

it("starts Watch on opening, once, when this match is not already playing", async () => {
  const calls = stub(idle);
  renderWithProviders(<App />, "/veo/veo-a");
  await screen.findByRole("heading", { level: 1, name: /RJ vs Northgate CB/ });
  await vi.waitFor(() => expect(calls.filter(c => c.url === `${H}/veo/action`)).toHaveLength(1));
  expect(calls.find(c => c.url === `${H}/veo/action`)!.body).toEqual({ action: "watch", match_id: "veo-a" });
});

it("does not start Watch for an expired match", async () => {
  const calls = stubExpired();
  renderWithProviders(<App />, "/veo/veo-a");
  expect(await screen.findByText(/Veo no longer has the video/)).toBeInTheDocument();
  expect(calls.filter(c => c.url === `${H}/veo/action`)).toHaveLength(0);
  expect(screen.queryByRole("button", { name: /Download full match/ })).toBeNull();
});

function stubExpired() {
  return routes([{ ...match, available: false }], idle);
}

/** Stubbed helper and app; returns the POST calls made (url and JSON body). */
function routes(library: object[], status: object) {
  stubFetch({ [`${H}/veo/library`]: library, [`${H}/veo/account`]: status, [`${H}/veo/action`]: { accepted: true },
    [`${H}/library`]: [], [`${H}/account`]: { configured: false, state: "idle", busy: false },
    "/api/settings/home-teams": { hudl: null, veo: null }, "/api/notes": [] });
  const fn = vi.mocked(fetch);
  return {
    filter: (keep: (c: { url: string; body: unknown }) => boolean) => posts(fn).filter(keep),
    find: (keep: (c: { url: string; body: unknown }) => boolean) => posts(fn).find(keep),
  };
}
function posts(fn: ReturnType<typeof vi.mocked<typeof fetch>>) {
  return fn.mock.calls.filter(([, init]) => init?.method === "POST")
    .map(([input, init]) => ({ url: String(input), body: JSON.parse(String(init?.body ?? "null")) }));
}

// Owner request 2026-11-13: tick boxes, as on a Hudl match. Ticked highlights are what
// Play Tagged plays, the reel uses and Download saves; with none ticked, all shown.
it("makes a highlight reel from the ticked highlights, else the ones shown", async () => {
  stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  const rail = await screen.findByRole("navigation", { name: "Highlight types" });
  await user.click(within(rail).getByRole("button", { name: /GOAL\s*2/ }));
  expect(screen.getByRole("button", { name: /Make highlight reel \(2\)/ })).toBeInTheDocument();
  await user.click(screen.getByRole("checkbox", { name: "Select GOAL at 31:40" }));
  await user.click(screen.getByRole("button", { name: /Make highlight reel \(1\)/ }));
  expect(await screen.findByText("HIGHLIGHT REEL STUDIO")).toBeInTheDocument();
  const stored = JSON.parse(sessionStorage.getItem("fm.reel.selection")!);
  expect(stored).toMatchObject({ source: "veo", items: [{ match_id: "veo-a", moment_ids: ["h3"] }] });
  sessionStorage.clear();
});

it("plays the ticked highlights back to back", async () => {
  stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("checkbox", { name: "Select SHOT ON GOAL at 1:04" }));
  await user.click(screen.getByRole("checkbox", { name: "Select GOAL at 31:40" }));
  await user.click(screen.getByRole("button", { name: /Play Tagged \(2\)/ }));
  const playing = screen.getByRole("status", { name: "Tagged playback" });
  expect(playing).toHaveTextContent(/1 of 2.*1:04.*SHOT ON GOAL/);
  const video = screen.getByLabelText("Veo match video") as HTMLVideoElement;
  Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: 85 });
  video.dispatchEvent(new Event("timeupdate"));
  await vi.waitFor(() => expect(screen.getByRole("status", { name: "Tagged playback" })).toHaveTextContent(/2 of 2.*31:40.*GOAL/));
  await user.click(screen.getByRole("button", { name: "Stop tagged playback" }));
  expect(screen.queryByRole("status", { name: "Tagged playback" })).toBeNull();
});

it("downloads the ticked highlights as one video or separate files", async () => {
  const calls = stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("checkbox", { name: "Select GOAL at 5:00" }));
  await user.click(screen.getByRole("button", { name: "Download selected moments" }));
  await user.click(screen.getByRole("button", { name: /Separate files/ }));
  await vi.waitFor(() => expect(calls.filter(c => c.url === `${H}/veo/action`)).toHaveLength(1));
  expect(calls.find(c => c.url === `${H}/veo/action`)!.body).toMatchObject({ action: "moments", match_id: "veo-a", moment_ids: ["h2"], combined: false });
});

it("links the saved highlights once the helper has cut them", async () => {
  stub({ ...ready, state: "done", filename: "moments/RJ moments (ab12cd34).zip", message: "1 highlights saved in the moments folder.",
    download_url: `${H}/files/scope/moments/RJ%20moments%20(ab12cd34).zip` });
  renderWithProviders(<App />, "/veo/veo-a");
  expect(await screen.findByRole("link", { name: /Save the highlights/ })).toHaveAttribute("href", `${H}/files/scope/moments/RJ%20moments%20(ab12cd34).zip`);
});
