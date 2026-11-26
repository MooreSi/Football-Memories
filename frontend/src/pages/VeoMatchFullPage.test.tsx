import { act, screen, within } from "@testing-library/react";
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

// Decision 009 (owner, 2026-11-14): Veo's own team-split stats and events, read at
// Refresh, shown as us v them with the goals and shots on a timeline.
const teamData = {
  stats: { goals: { own: 2, opponent: 1 }, total_attempts: { own: 7, opponent: 3 }, corners: { own: 1, opponent: 4 } },
  events: [
    { type: "SHOT", side: "own", time_s: 60, period: 1 }, { type: "GOAL", side: "own", time_s: 300, period: 1 },
    { type: "SHOT", side: "opponent", time_s: 900, period: 1 }, { type: "GOAL", side: "opponent", time_s: 1900, period: 2 },
    { type: "THROW IN", side: "own", time_s: 1000, period: 1 },
  ],
};

it("shows Veo's team-split stats, us v the opponent", async () => {
  routes([{ ...match, team_data: teamData }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const team = await screen.findByRole("region", { name: "Team stats" });
  expect(within(team).getByRole("columnheader", { name: "Us" })).toBeInTheDocument();
  expect(within(team).getByRole("columnheader", { name: "Opponent" })).toBeInTheDocument();
  const attempts = within(team).getByRole("row", { name: /Attempts/ });
  expect(attempts).toHaveTextContent(/7.*Attempts.*3/);
  expect(within(team).getByRole("row", { name: /Corners/ })).toHaveTextContent(/1.*Corners.*4/);
  expect(within(team).getByRole("row", { name: /Throw-ins/ })).toHaveTextContent(/1.*Throw-ins.*0/);
});

it("jumps to a goal or shot from the team timeline", async () => {
  routes([{ ...match, team_data: teamData }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const team = await screen.findByRole("region", { name: "Team stats" });
  const line = within(team).getByRole("group", { name: "Goals and shots by team" });
  expect(within(line).getAllByRole("button")).toHaveLength(4);
  const video = await screen.findByLabelText("Veo match video") as HTMLVideoElement;
  Object.defineProperty(video, "readyState", { configurable: true, value: 4 });
  await userEvent.setup().click(within(line).getByRole("button", { name: "Opponent GOAL at 31:40" }));
  expect(video.currentTime).toBe(1900);
});

// Owner request 2026-11-26: Match stats beside Team stats, as charts, with recent form.
it("shows the match's numbers as charts in a Match stats tab, against earlier matches", async () => {
  const earlierMatch = { ...match, id: "veo-0", title: "261020 RJ vs Eastfield CB", team_data: { stats: { goals: { own: 1, opponent: 0 } }, events: [] } };
  routes([{ ...match, team_data: teamData }, earlierMatch], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  await userEvent.setup().click(await screen.findByRole("tab", { name: "Match stats" }));
  const panel = screen.getByRole("region", { name: "Match stats" });
  expect(within(panel).getByLabelText("Attempts: Us 7, Opponent 3")).toBeInTheDocument();
  expect(within(panel).getByRole("figure", { name: "Goals headline" })).toHaveTextContent(/vs last 1 avg.*\+100%/);
  expect(within(panel).getByRole("button", { name: "Opponent goal at 31:40" })).toBeInTheDocument();
});

it("shows no team stats for a match Veo gave none for", async () => {
  routes([{ ...match, team_data: null }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  await screen.findByRole("region", { name: "Match insights" });
  expect(screen.queryByRole("region", { name: "Team stats" })).toBeNull();
});

// Owner request 2026-11-15: Veo's team events in the rail, chosen like highlights, and
// momentum in Match insights as on a Hudl match.
const teamMoments = [
  { id: "t-own-corner-kick-400000", category: "OUR CORNER", side: "own", time_s: 390, duration_s: 15, team: true },
  { id: "t-opponent-corner-kick-900000", category: "OPPONENT CORNER", side: "opponent", time_s: 890, duration_s: 15, team: true },
  { id: "t-own-foul-1000000", category: "OUR FOUL", side: "own", time_s: 990, duration_s: 15, team: true },
];

it("lists the team events in the rail and downloads the ones chosen", async () => {
  const calls = routes([{ ...match, team_data: teamData, team_moments: teamMoments }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  const rail = await screen.findByRole("navigation", { name: "Highlight types" });
  expect(within(rail).getByRole("button", { name: /ALL HIGHLIGHTS\s*3/ })).toBeInTheDocument();
  expect(within(rail).getByRole("heading", { name: "Team events" })).toBeInTheDocument();
  const team = within(rail).getAllByRole("button").map(b => b.textContent).filter(t => /^(OUR|OPPONENT)/.test(t ?? ""));
  expect(team).toEqual(["OUR CORNER1", "OPPONENT CORNER1", "OUR FOUL1"]);
  await user.click(within(rail).getByRole("button", { name: /OUR CORNER\s*1/ }));
  const list = screen.getByRole("list", { name: "Veo highlights" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  expect(within(list).getByText("Veo team data")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Download our corner moments/ }));
  await user.click(screen.getByRole("button", { name: /Separate files/ }));
  await vi.waitFor(() => expect(calls.filter(c => c.url === `${H}/veo/action` && (c.body as { action: string }).action === "moments")).toHaveLength(1));
  expect(calls.find(c => (c.body as { action?: string })?.action === "moments")!.body).toMatchObject({ moment_ids: ["t-own-corner-kick-400000"] });
});

it("shows momentum minute by minute from Veo's team events", async () => {
  routes([{ ...match, team_data: teamData }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const insights = await screen.findByRole("region", { name: "Match insights" });
  expect(within(insights).getByRole("img", { name: "Momentum chart" })).toBeInTheDocument();
  expect(within(insights).getByText(/Veo gives no possession/)).toBeInTheDocument();
});

// Owner request 2026-11-15: several highlight types and team events at once.
it("shows and reels several chosen highlight types at once", async () => {
  routes([{ ...match, team_data: teamData, team_moments: teamMoments }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  const rail = await screen.findByRole("navigation", { name: "Highlight types" });
  await user.click(within(rail).getByRole("button", { name: /SHOT ON GOAL\s*1/ }));
  await user.click(within(rail).getByRole("button", { name: /OUR CORNER\s*1/ }));
  expect(within(rail).getByRole("button", { name: /SHOT ON GOAL\s*1/ })).toHaveAttribute("aria-pressed", "true");
  const list = screen.getByRole("list", { name: "Veo highlights" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: /Make highlight reel \(2\)/ }));
  expect(await screen.findByText("HIGHLIGHT REEL STUDIO")).toBeInTheDocument();
  expect(JSON.parse(sessionStorage.getItem("fm.reel.selection")!)).toMatchObject({ items: [{ match_id: "veo-a", moment_ids: ["h1", "t-own-corner-kick-400000"] }] });
  sessionStorage.clear();
});

// Owner request 2026-11-15: the record against this opponent, as on a Hudl match.
it("shows the record against this opponent from the Veo matches", async () => {
  const earlier = { ...match, id: "veo-b", title: "261001 RJ vs Northgate CB", score: { ours: 0, theirs: 2 }, moments: [] };
  const other = { ...match, id: "veo-c", title: "261015 RJ vs Southside", score: { ours: 5, theirs: 0 }, moments: [] };
  routes([match, earlier, other], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const h2h = await screen.findByRole("region", { name: "Head to head" });
  expect(within(h2h).getByRole("heading", { name: /Against Northgate CB/ })).toBeInTheDocument();
  expect(h2h).toHaveTextContent("2 played · W 1 D 0 L 1 · goals 2-3");
  expect(within(h2h).getByRole("link", { name: /2026-10-01.*0-2/ })).toHaveAttribute("href", "/veo/veo-b");
});

// Owner request 2026-11-15: "Veo highlights should show Veo Events so you can filter
// by these". The panel has its own filters for highlights and Veo events, kept in
// step with the rail.
it("filters the highlights panel by Veo events, in step with the rail", async () => {
  routes([{ ...match, team_data: teamData, team_moments: teamMoments }], ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  const panel = await screen.findByRole("region", { name: "Veo highlight moments" });
  const events = within(panel).getByRole("group", { name: "Veo events" });
  expect(within(events).getAllByRole("button").map(b => b.textContent)).toEqual(["All events 3", "OUR CORNER 1", "OPPONENT CORNER 1", "OUR FOUL 1"]);
  await user.click(within(events).getByRole("button", { name: /^OUR FOUL\s*1/ }));
  const list = within(panel).getByRole("list", { name: "Veo highlights" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  expect(within(list).getByText("OUR FOUL")).toBeInTheDocument();
  const rail = screen.getByRole("navigation", { name: "Highlight types" });
  expect(within(rail).getByRole("button", { name: /OUR FOUL\s*1/ })).toHaveAttribute("aria-pressed", "true");
  await user.click(within(events).getByRole("button", { name: /All events/ }));
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  const kinds = within(panel).getByRole("group", { name: "Highlight types" });
  await user.click(within(kinds).getByRole("button", { name: /^GOAL\s*2/ }));
  expect(within(list).getAllByRole("listitem")).toHaveLength(5);
  await user.click(within(kinds).getByRole("button", { name: /^All highlights/ }));
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
});

// Owner request 2026-11-15: the account films two clubs; team stats name the club the title names.
it("names the club the title names in the team stats", async () => {
  stubFetch({ [`${H}/veo/library`]: [{ ...match, title: "261108 HT vs Northgate CB", team: "Hill Town", team_data: teamData }],
    [`${H}/veo/account`]: ready, [`${H}/veo/action`]: { accepted: true }, [`${H}/library`]: [], [`${H}/account`]: { configured: false, state: "idle", busy: false },
    "/api/settings/home-teams": { hudl: null, veo: "Riverside Juniors" }, "/api/notes": [] });
  renderWithProviders(<App />, "/veo/veo-a");
  const team = await screen.findByRole("region", { name: "Team stats" });
  expect(await within(team).findByRole("columnheader", { name: "Hill Town" })).toBeInTheDocument();
});

// Owner report 2026-11-17: Next during Play Tagged ended the queue and the match just played on.
it("keeps Play Tagged going when Next or Previous moves between the queued highlights", async () => {
  stub(ready);
  renderWithProviders(<App />, "/veo/veo-a");
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Play Tagged \(3\)/ }));
  const bar = () => screen.getByRole("status", { name: "Tagged playback" });
  const video = screen.getByLabelText("Veo match video") as HTMLVideoElement;
  // Each timeupdate gets its own render, as in a browser (they arrive about 250 ms apart).
  const at = (s: number) => act(() => {
    Object.defineProperty(video, "currentTime", { configurable: true, writable: true, value: s });
    video.dispatchEvent(new Event("timeupdate"));
  });
  expect(bar()).toHaveTextContent(/1 of 3.*1:04/);
  await user.click(screen.getByRole("button", { name: /Next highlight/ }));
  expect(bar()).toHaveTextContent(/2 of 3.*5:00/);
  await at(301); await at(321);
  expect(bar()).toHaveTextContent(/3 of 3.*31:40/);
  await at(1901);
  await user.keyboard("b");
  // The video still reports 31:41 until the seek lands: that must not count as 5:00 ending.
  await at(1901);
  expect(bar()).toHaveTextContent(/2 of 3.*5:00/);
});
