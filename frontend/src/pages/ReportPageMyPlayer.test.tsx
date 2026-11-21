import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { EMPTY_ENTRY } from "../lib/goals";
import { renderWithProviders, stubFetch } from "../test/render";
import { ReportPage } from "./ReportPage";
const H = "http://127.0.0.1:8766";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
function routes(position: string) {
  const p = { id: 9, display_name: "Sam Example", position, shirt_number: "1", club_name: "Aston Villa", photo_url: null,
    is_primary: true, totals: { matches: 0, moments: 0, unwatched: 0, favourites: 0 }, categories: [], teams: [], per_match: [], teammates: [], first_match_date: null, latest_match_date: null };
  const m = { id: "a", title: "261101 U11 v Town", age_group: "U11", season_label: "2026/27", capture_key: "a", moments: [{ id: "p", category: "Sam Example", time_s: 10, duration_s: 10, actions: ["passes"] }] };
  return { [`${H}/library`]: [m, { ...m, id: "b", title: "261108 U11 v City" }], [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: [], [`${H}/veo/account`]: { configured: false, busy: false },
    "/api/preferences": { primary_player_id: 9 }, "/api/players/9": p, "/api/players": [p], "/api/settings/home-teams": { hudl: "Aston Villa", veo: null }, "/api/scores": {},
    "/api/goals": position === "Goalkeeper" ? Object.fromEntries(["a", "b"].map(id => [id, { ...EMPTY_ENTRY, keepers: [{ name: "Sam Example", saves: 3 }], added: [{ id: "g", side: "theirs" }] }])) : {} };
}
it("uses the primary profile's goalkeeper position and saved stats in the match report", async () => {
  stubFetch(routes("Goalkeeper"));
  renderWithProviders(<Routes><Route path="/report/match/:id" element={<ReportPage kind="match" />} /></Routes>, "/report/match/a");
  const card = await screen.findByRole("img", { name: /Aston Villa v Town/ });
  expect(card).toHaveTextContent("Shots saved3");
  expect(card).toHaveTextContent("Save percentage75%");
  expect(card).not.toHaveTextContent(/Tagged moments|During our chances|Passes/);
  expect(card.querySelector('[data-section="player-sources"]')).toHaveTextContent("Goalkeeper. Sources:");
});
it("aggregates the primary goalkeeper's whole season in the season report", async () => {
  stubFetch(routes("Goalkeeper"));
  renderWithProviders(<Routes><Route path="/report/season" element={<ReportPage kind="season" />} /></Routes>, "/report/season");
  const card = await screen.findByRole("img", { name: /2026\/27/ });
  expect(card).toHaveTextContent("Shots saved6");
  expect(card).toHaveTextContent("Goals conceded2");
  expect(card).toHaveTextContent("Save percentage75%");
});
it("uses the primary outfield profile's actions in its report", async () => {
  stubFetch(routes("Forward"));
  renderWithProviders(<Routes><Route path="/report/match/:id" element={<ReportPage kind="match" />} /></Routes>, "/report/match/a");
  const card = await screen.findByRole("img", { name: /Aston Villa v Town/ });
  expect(card).toHaveTextContent("Passes1");
  expect(card).toHaveTextContent("Penalties scored—");
  expect(card).not.toHaveTextContent(/Shots saved|Tagged moments|During our chances/);
});

it("keeps the team report usable if the primary profile cannot be loaded", async () => {
  const saved = routes("Goalkeeper") as Record<string, unknown>;
  delete saved["/api/preferences"];
  stubFetch(saved);
  renderWithProviders(<Routes><Route path="/report/match/:id" element={<ReportPage kind="match" />} /></Routes>, "/report/match/a");
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load My Player");
  expect(screen.getByRole("img", { name: /Aston Villa v Town/ })).toBeInTheDocument();
});
