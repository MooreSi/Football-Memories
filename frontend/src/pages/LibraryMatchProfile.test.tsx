import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const H = "http://127.0.0.1:8766";
const tag = (id: string, category: string) => ({ id, category, time_s: 60, duration_s: 5 });
const remote = [
  { id: "stoke", title: "261108 U11 v Stoke (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", duration_s: 3600, moments: [
    tag("1", "GOAL"), tag("2", "GOAL"), tag("3", "CORNER"), tag("4", "SHOT"), tag("5", "SAM EXAMPLE"), tag("6", "BALL OUT OF PLAY")] },
  { id: "wba", title: "261101 U11s v West Brom (A)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", duration_s: 5400, moments: [
    tag("7", "PRESSING"), tag("8", "TACKLE"), tag("9", "FREE KICK")] },
  { id: "derby", title: "261025 U11 v Derby (H)", age_group: "U11", age_groups: ["U11"], season_label: "2026/27", duration_s: 5400, moments: [
    tag("a", "ROVERS POSSESSION"), tag("b", "ROVERS POSSESSION"), tag("c", "OPPOSITION POSSESSION"),
    tag("d", "ROVERS CHANCE"), tag("e", "OPPOSITION CHANCE"), tag("f", "OPPOSITION CHANCE"),
    tag("g", "ROVERS CORNER"), tag("h", "CONTESTED POSSESSION")] },
];

function render() {
  stubFetch({
    "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
    "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
    "/api/preferences": {}, "/api/players": [], "/api/teams": [], "/api/seasons": [],
    [`${H}/library`]: remote, [`${H}/account`]: { configured: true, state: "ready", busy: false },
  });
  renderWithProviders(<LibraryPage />);
}

it("replaces Most tagged with a Match profile radar for the match on screen, and follows the hero", async () => {
  render();
  const hero = await screen.findByRole("region", { name: "Featured match" });
  await within(hero).findByRole("heading", { name: /Stoke City/ });
  expect(screen.queryByRole("region", { name: "Top tags" })).toBeNull();
  const profile = screen.getByRole("region", { name: "Match profile" });
  expect(within(profile).getByRole("heading", { name: "Match Profile" })).toBeInTheDocument();
  expect(within(profile).getByText(/vs\. Stoke City U11$/)).toBeInTheDocument();
  expect(within(profile).getByRole("img")).toHaveAccessibleName("Match profile: GOAL 2, CORNER 1, SHOT 1");

  await userEvent.click(within(hero).getByRole("button", { name: "Next match" }));
  expect(within(screen.getByRole("region", { name: "Match profile" })).getByRole("img"))
    .toHaveAccessibleName("Match profile: FREE KICK 1, PRESSING 1, TACKLE 1");
});

it("draws one shape for our team and one for the opposition when the codes say whose they are", async () => {
  render();
  const hero = await screen.findByRole("region", { name: "Featured match" });
  await within(hero).findByRole("heading", { name: /Stoke City/ });
  await userEvent.click(within(hero).getByRole("button", { name: "Next match" }));
  await userEvent.click(within(hero).getByRole("button", { name: "Next match" }));
  const profile = screen.getByRole("region", { name: "Match profile" });
  expect(within(profile).getByRole("img")).toHaveAccessibleName(
    "Match profile, Home v Derby County: Possession 67% v 33%, Chance 1 v 2, Corner 1 v 0");
  expect(profile.querySelector("[data-side=ours]")).not.toBeNull();
  expect(profile.querySelector("[data-side=theirs]")).not.toBeNull();
  expect(within(profile).getByText("Derby County")).toBeInTheDocument();
  expect(within(profile).getByText(/CONTESTED POSSESSION 1/)).toBeInTheDocument();
});
