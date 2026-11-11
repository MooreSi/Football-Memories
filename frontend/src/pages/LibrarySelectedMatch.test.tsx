import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const H = "http://127.0.0.1:8766";
const remote = [
  { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", duration_s: 3600, moments: [
    { id: "g1", category: "Goal", time_s: 600, duration_s: 5 }, { id: "s1", category: "Sam Example", time_s: 900, duration_s: 5 },
    { id: "v1", category: "Save", time_s: 30, duration_s: 5 }] },
  { id: "wba", title: "261101 U11s v West Brom (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", duration_s: 5400, moments: [
    { id: "c1", category: "Corner", time_s: 100, duration_s: 5 }, { id: "c2", category: "Corner", time_s: 200, duration_s: 5 }] },
  { id: "derby", title: "260301 U10 v Derby (H)", age_group: "U10", age_groups: ["U10"], season_label: "2025/26", duration_s: 1800, moments: [
    { id: "d1", category: "Goal", time_s: 5, duration_s: 5 }] },
];

function render() {
  localStorage.setItem("fm.hudl.age", "U11");
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 9, moments: 99, footage_seconds: 99999, teams: 3, players: 7, top_tags: [{ name: "All-time tag", count: 50 }], recent_moments: [] },
    "/api/preferences": { primary_player_id: 5 }, "/api/players": [{ id: 5, display_name: "Sam Example", shirt_number: null, position: null, moments: 0, matches: 0 }],
    "/api/teams": [], "/api/seasons": [], [`${H}/library`]: remote, [`${H}/account`]: { configured: true, state: "ready", busy: false },
  });
  renderWithProviders(<LibraryPage />);
}

it("shows the displayed match's own moments and tags, not just the selected player", async () => {
  render();
  await within(await screen.findByRole("region", { name: "Featured match" })).findByRole("heading", { name: /Stoke City/ });
  const recent = screen.getByRole("region", { name: "Recent moments" });
  expect(within(recent).getByText("Goal")).toBeInTheDocument();
  expect(within(recent).getByText("Save")).toBeInTheDocument();
  expect(within(recent).getByText("Sam Example")).toBeInTheDocument();
  const tags = screen.getByRole("region", { name: "Top tags" });
  expect(within(tags).getByText("Goal")).toBeInTheDocument();
  expect(within(tags).queryByText("All-time tag")).toBeNull();
});

it("follows the hero when stepping to another match", async () => {
  render();
  const hero = await screen.findByRole("region", { name: "Featured match" });
  await within(hero).findByRole("heading", { name: /Stoke City/ });
  await userEvent.click(within(hero).getByRole("button", { name: "Next match" }));
  const panel = screen.getByRole("region", { name: "Selected match" });
  expect(within(panel).getByText("West Bromwich Albion")).toBeInTheDocument();
  const recent = screen.getByRole("region", { name: "Recent moments" });
  expect(within(recent).getAllByText("Corner")).toHaveLength(2);
  expect(within(recent).queryByText("Goal")).toBeNull();
  const tags = screen.getByRole("region", { name: "Top tags" });
  expect(within(tags).getByText("Corner")).toBeInTheDocument();
  expect(within(tags).getByText("2")).toBeInTheDocument();
});

it("overview counts only the selected age group and season", async () => {
  render();
  const overview = await screen.findByRole("region", { name: "Overview" });
  expect(await within(overview).findByText("U11 · All seasons")).toBeInTheDocument();
  expect(within(overview).getByLabelText("Matches")).toHaveTextContent("2");
  expect(within(overview).getByLabelText("Moments")).toHaveTextContent("5");
  expect(within(overview).getByLabelText("Footage")).toHaveTextContent("2.5");
  expect(within(overview).getByLabelText("Players")).toHaveTextContent("1");
});
