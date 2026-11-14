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

function render() {
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
    "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [], "/api/notes": [],
    "/api/settings/home-teams": { hudl: null, veo: null },
    [`${H}/library`]: hudl, [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: veo, [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
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
