import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { MatchSummary } from "../api/types";
import { fixtureLabel, latestFirst } from "../lib/hudlFixture";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

const local: MatchSummary = {
  id: 2, team_id: 2, team_name: "Aston Villa U10", season_id: 1, season_label: "2026/27", age_group: "U10",
  opponent: "Stoke City", match_date: "2026-11-08", competition: null, event_count: 0, media_id: 3,
  duration_s: 60, thumbnail_url: null, offline: true,
};
const remote: Record<string, unknown>[] = [
  { id: "wba", title: "261101 U11s v West Brom (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", tag_status: "synced", moments: [{ id: "1", category: "Goal", time_s: 1, duration_s: 1 }] },
  { id: "u10", title: "261109 U10 v Derby (H)", age_group: "U10", age_groups: ["U10"], season_label: "2026/27" },
  { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", thumbnail_url: "http://127.0.0.1:8766/account/match/stoke/thumbnail" },
  { id: "liv", title: "261026 U11s v Liverpool (A) - Pitch 2", age_group: "U11", age_groups: ["U11"], season_label: "2026/27" },
];

function render() {
  stubFetch({
    "/api/matches": { total: 1, page: 1, page_size: 24, items: [local] },
    "/api/stats": { matches: 1, moments: 0, footage_seconds: 60, teams: 1, players: 0, top_tags: [], recent_moments: [] },
    "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [],
    "http://127.0.0.1:8766/library": remote,
    "http://127.0.0.1:8766/account": { configured: true, state: "ready", busy: false },
  });
  renderWithProviders(<LibraryPage />);
}

it("names fixtures from Hudl titles with the full club names", () => {
  expect(fixtureLabel("261108 U11 v Stoke (A)", "Aston Villa", "U11")).toBe("Aston Villa vs. Stoke City U11");
  expect(fixtureLabel("261026 U11s v Liverpool (A) - Pitch 2", "Aston Villa", "U11")).toBe("Aston Villa vs. Liverpool U11");
  expect(fixtureLabel("Doku Combo 2", "Aston Villa", "U11")).toBe("Doku Combo 2");
});

it("orders by the date in the Hudl title, newest first, undated last", () => {
  const ids = latestFirst([{ id: "x", title: "Highlights" }, { id: "old", title: "260101 U11 v A" }, { id: "new", title: "261108 U11 v B" }]).map((m) => m.id);
  expect(ids).toEqual(["new", "old", "x"]);
});

it("features the latest Hudl match for the selected age group and steps with the arrows", async () => {
  localStorage.setItem("fm.hudl.age", "U11");
  render();
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(await within(hero).findByRole("heading", { name: "Aston Villa vs. Stoke City U11" })).toBeInTheDocument();
  expect(within(hero).getByRole("link", { name: /Watch match/ })).toHaveAttribute("href", "/hudl/stoke");
  const user = userEvent.setup();
  await user.click(within(hero).getByRole("button", { name: "Next match" }));
  expect(within(hero).getByRole("heading", { name: "Aston Villa vs. West Bromwich Albion U11" })).toBeInTheDocument();
  await user.click(within(hero).getByRole("button", { name: "Next match" }));
  expect(within(hero).getByRole("heading", { name: "Aston Villa vs. Liverpool U11" })).toBeInTheDocument();
  await user.click(within(hero).getByRole("button", { name: "Previous match" }));
  await user.click(within(hero).getByRole("button", { name: "Previous match" }));
  expect(within(hero).getByRole("heading", { name: "Aston Villa vs. Stoke City U11" })).toBeInTheDocument();
  expect(within(hero).getByRole("button", { name: "Previous match" })).toBeDisabled();
});

it("shows the latest Hudl match for the age group and that match's moments", async () => {
  localStorage.setItem("fm.hudl.age", "U11");
  render();
  const latest = await screen.findByRole("region", { name: "Latest match" });
  expect(await within(latest).findByText("Stoke City")).toBeInTheDocument();
  expect(within(latest).getByText("Aston Villa")).toBeInTheDocument();
  expect(within(latest).getByRole("link", { name: /Watch now/ })).toHaveAttribute("href", "/hudl/stoke");
  const recent = screen.getByRole("region", { name: "Recent moments" });
  expect(within(recent).getByText(/Moments appear here once this match's tags are indexed/)).toBeInTheDocument();
});

it("lists moments from the latest match for the selected age group", async () => {
  localStorage.setItem("fm.hudl.age", "U11");
  remote[2] = { ...remote[2], moments: [{ id: "g1", category: "Goal", time_s: 600, duration_s: 5 }, { id: "s1", category: "Save", time_s: 30, duration_s: 5 }] };
  render();
  // Owner request 2026-11-11: moments read from kick-off, not from the end of the video.
  await screen.findByText(/From kick-off/);
  const recent = screen.getByRole("region", { name: "Recent moments" });
  const links = within(recent).getAllByRole("link");
  expect(links[0]).toHaveAttribute("href", "/hudl/stoke?moment=s1");
  expect(links[0]).toHaveTextContent("0:30");
  expect(links[1]).toHaveTextContent("10:00");
  expect(links[1]).toHaveTextContent("Goal");
  expect(links).toHaveLength(2);
});

it("names our side from the player's Plays for when nothing is imported yet", async () => {
  // Owner report 2026-11-12: a fresh install with only Hudl matches showed "Home vs. Stoke City"
  // although the player profile says Plays for Aston Villa.
  localStorage.setItem("fm.hudl.age", "U11");
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 1, top_tags: [], recent_moments: [] },
    "/api/preferences": { primary_player_id: 5 },
    "/api/players/5": { id: 5, display_name: "Sam Example", club_name: "Aston Villa", position: null, photo_url: null,
      totals: { matches: 0, moments: 0, unwatched: 0, favourites: 0 }, categories: [], teams: [], per_match: [], teammates: [],
      first_match_date: null, latest_match_date: null },
    "/api/teams": [], "/api/seasons": [],
    "http://127.0.0.1:8766/library": remote,
    "http://127.0.0.1:8766/account": { configured: true, state: "ready", busy: false },
  });
  renderWithProviders(<LibraryPage />);
  const hero = await screen.findByRole("region", { name: "Featured match" });
  expect(await within(hero).findByRole("heading", { name: "Aston Villa vs. Stoke City U11" })).toBeInTheDocument();
  expect(within(hero).queryByRole("heading", { name: /^Home vs\./ })).toBeNull();
});
