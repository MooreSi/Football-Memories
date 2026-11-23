import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";

const H = "http://127.0.0.1:8766";
afterEach(() => {vi.unstubAllGlobals(); localStorage.clear();});
it("filters imported, Hudl and Veo cards together by tournament and entered team", async () => {
  stubFetch({
    "/api/matches": {total: 1, page: 1, page_size: 24, items: [{id: 7, team_name: "Riverside", opponent: "Town", season_label: "2026/27", event_count: 0, match_date: "2026-11-22"}]},
    "/api/matches/7": {events: []},
    "/api/stats": {matches: 1, moments: 0, footage_seconds: 0, teams: 1, players: 0, top_tags: [], recent_moments: []},
    "/api/preferences": {primary_player_id: null}, "/api/teams": [], "/api/seasons": [], "/api/notes": [], "/api/watching": [],
    "/api/scores": {}, "/api/settings/home-teams": {hudl: "Riverside", veo: "Riverside"},
    "/api/tournaments": [{id: "cup", name: "Winter Cup", entries: {"local:7": "Blue", "hudl:one": "Blue", "veo:one": "White"}}],
    [`${H}/library`]: [{id: "one", title: "261122 U11 v Town", moments: [], age_group: "U11", season_label: "2026/27"}, {id: "two", title: "261121 U11 v Rovers", moments: [], age_group: "U11"}],
    [`${H}/account`]: {configured: true, state: "ready", busy: false},
    [`${H}/veo/library`]: [{id: "one", title: "261122 Riverside vs Northgate", available: true, moments: [], age_group: "U11", season_label: "2026/27", score: {ours: 4, theirs: 1}}],
    [`${H}/veo/account`]: {configured: true, state: "ready", busy: false},
  });
  renderWithProviders(<LibraryPage />);
  const collection = await screen.findByRole("region", {name: "All matches"});
  await within(collection).findByLabelText("Select 261122 U11 v Town for tournament");
  fireEvent.change(screen.getByLabelText("Tournament"), {target: {value: "cup"}});
  expect(within(collection).queryByRole("link", {name: "261121 U11 v Rovers"})).not.toBeInTheDocument();
  expect(within(collection).getByRole("link", {name: "261122 Riverside vs Northgate"})).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Tournament team"), {target: {value: "Blue"}});
  expect(within(collection).queryByRole("link", {name: "261122 Riverside vs Northgate"})).not.toBeInTheDocument();
  expect(within(collection).getByRole("link", {name: "Riverside vs Town"})).toBeInTheDocument();
  expect(within(collection).getByRole("link", {name: "261122 U11 v Town"})).toBeInTheDocument();
});
