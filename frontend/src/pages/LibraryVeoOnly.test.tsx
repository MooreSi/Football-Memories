import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";

// Owner request 2026-11-14: with Show Hudl off and Show Veo on, the Library's hero
// (poster), latest match, overview, match profile and recent moments use Veo matches.
const H = "http://127.0.0.1:8766";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

const hudl = [{ id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", moments: [{ id: "1", category: "Goal", time_s: 1, duration_s: 1 }] }];
const veo = [
  { id: "veo-a", source: "veo", title: "261108 RJ vs Northgate CB", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", available: true,
    duration_s: 3300, score: { ours: 4, theirs: 2 }, poster_url: `${H}/veo/match/veo-a/poster`,
    moments: [{ id: "h2", category: "GOAL", time_s: 300, duration_s: 20 }, { id: "h1", category: "SHOT ON GOAL", time_s: 64, duration_s: 20 }] },
  { id: "veo-b", source: "veo", title: "261025 RJ vs Town", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", available: true, duration_s: 3000, moments: [] },
];

function render(veoMatches: unknown[] = veo, veoTeam: string | null = null) {
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
    "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [], "/api/notes": [],
    "/api/settings/home-teams": { hudl: null, veo: veoTeam },
    [`${H}/library`]: hudl, [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: veoMatches, [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
  });
  renderWithProviders(<LibraryPage />);
}

it("features the newest Veo match, with its poster and score, when Hudl is hidden", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  render();
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(within(hero).getByText(/Northgate/)).toBeInTheDocument();
  expect(within(hero).getByText("Veo")).toBeInTheDocument();
  expect(hero.querySelector("img")).toHaveAttribute("src", `${H}/veo/match/veo-a/poster`);
  expect(within(hero).getByRole("link", { name: /Watch match/ })).toHaveAttribute("href", "/veo/veo-a");
  const latest = screen.getByRole("region", { name: "Latest match" });
  expect(latest).toHaveTextContent("4–2");
  expect(within(latest).getByRole("link", { name: /Watch now/ })).toHaveAttribute("href", "/veo/veo-a");
  const recent = screen.getByRole("region", { name: "Recent moments" });
  expect(within(recent).getAllByRole("listitem").map(li => li.textContent)).toEqual(["1:04SHOT ON GOAL", "5:00GOAL"]);
  const overview = screen.getByRole("region", { name: "Overview" });
  expect(within(overview).getByText("Matches").closest("div")?.parentElement).toHaveTextContent("2");
  expect(screen.queryByText(/Stoke/)).toBeNull();
});

it("keeps Hudl in the hero while Hudl is shown", async () => {
  render();
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(within(hero).getByText(/Stoke/)).toBeInTheDocument();
});

// Owner request 2026-11-15: the Veo match profile shows Veo's team events, us v them,
// and the season report is offered with only Veo shown.
it("profiles the Veo match from its team events and offers the season report", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  const withData = { ...veo[0], team_data: { stats: { goals: { own: 4, opponent: 2 }, total_attempts: { own: 12, opponent: 10 }, corners: { own: 3, opponent: 2 },
    fouls: { own: 2, opponent: 8 } }, events: [] } };
  render([withData, veo[1]]);
  const profile = await screen.findByRole("region", { name: "Match profile" });
  expect(await within(profile).findByRole("img", { name: /Corners 3 v 2/ })).toBeInTheDocument();
  expect(within(profile).getByRole("img", { name: /Fouls 2 v 8/ })).toBeInTheDocument();
  expect(within(profile).getByRole("link", { name: "Share season report" })).toHaveAttribute("href", "/report/season");
});

// Owner request 2026-11-15: the account films two clubs; the hero and latest match name the club the title names.
it("names the club the shown Veo match's title names", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  render([{ ...veo[0], title: "261108 HT vs Northgate CB", team: "Hill Town" }, veo[1]], "Riverside Juniors");
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(await within(hero).findByText(/Hill Town vs\. Northgate CB/)).toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "Latest match" })).getAllByText(/Hill Town/).length).toBeGreaterThan(0);
});

// Owner request 2026-11-15: a Veo match's recent moments start with Veo's team events, then the highlights.
it("lists the Veo team events first in recent moments, then the highlights", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  const teamMoments = [
    { id: "t2", category: "OPPONENT CORNER", side: "opponent", time_s: 890, duration_s: 15, team: true },
    { id: "t1", category: "OUR CORNER", side: "own", time_s: 390, duration_s: 15, team: true },
  ];
  render([{ ...veo[0], team_moments: teamMoments }, veo[1]]);
  await screen.findByText(/tagged in this match/);
  const recent = screen.getAllByRole("region", { name: "Recent moments" }).find((r) => /tagged in this match/.test(r.textContent ?? ""))!;
  const rows = within(recent).getAllByRole("listitem").map((r) => r.textContent);
  expect(rows).toEqual([
    expect.stringMatching(/6:30.*OUR CORNER/), expect.stringMatching(/14:50.*OPPONENT CORNER/),
    expect.stringMatching(/1:04.*SHOT ON GOAL/), expect.stringMatching(/5:00.*GOAL/),
  ]);
  expect(recent).toHaveTextContent("4 tagged in this match");
});

it("links the Veo match profile to Opponents for the match's own club", async () => {
  // Owner request 2026-11-15: "add opponents to the match profile for veo".
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  render(veo, "Riverside Juniors");
  const profile = await screen.findByRole("region", { name: "Match profile" });
  expect(await within(profile).findByRole("link", { name: "Opponents" }))
    .toHaveAttribute("href", "/opponents?club=Riverside%20Juniors");
});

// Owner report 2026-11-20: Veo connected with no Hudl matches left All matches, the
// hero and the overview empty ("0 offline · 0 Hudl"). Shown Veo matches count too.
function renderBoth(hudlMatches: unknown[]) {
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
    "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [], "/api/notes": [],
    "/api/settings/home-teams": { hudl: null, veo: null },
    [`${H}/library`]: hudlMatches, [`${H}/account`]: { configured: false, state: "idle", busy: false },
    [`${H}/veo/library`]: veo, [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
  });
  renderWithProviders(<LibraryPage />);
}

it("shows Veo matches in the hero, counts and overview while Hudl is shown but empty", async () => {
  renderBoth([]);
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(within(hero).getByText(/Northgate/)).toBeInTheDocument();
  const overview = screen.getByRole("region", { name: "Overview" });
  expect(within(overview).getByText("Matches").closest("div")?.parentElement).toHaveTextContent("2");
  expect(within(overview).getByText("Moments").closest("div")?.parentElement).toHaveTextContent("2");
  expect(screen.getByRole("region", { name: "All matches" })).toHaveTextContent("0 offline · 0 Hudl · 2 Veo");
  expect(screen.queryByText("No matches yet.")).toBeNull();
});

it("counts Hudl and Veo matches together when both are shown", async () => {
  renderBoth(hudl);
  await screen.findByRole("region", { name: "Featured match" });
  const overview = screen.getByRole("region", { name: "Overview" });
  await vi.waitFor(() => expect(within(overview).getByText("Matches").closest("div")?.parentElement).toHaveTextContent("3"));
  expect(screen.getByRole("region", { name: "All matches" })).toHaveTextContent("0 offline · 1 Hudl · 2 Veo");
});
