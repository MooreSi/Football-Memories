import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";
import type { MatchSummary } from "../api/types";

const stats = {
  matches: 1, moments: 2, footage_seconds: 3600, teams: 1, players: 1,
  top_tags: [{ name: "Save", count: 2 }],
  recent_moments: [{ event_id: 11, match_id: 7, time_s: 932, category: "Save", players: ["Sam"],
    team_name: "Riverside U12", opponent: "Rovers", match_date: "2026-10-18" }],
};

const match: MatchSummary = {
  id: 7, team_id: 1, team_name: "Riverside U12", season_id: 1, season_label: "2026/27",
  age_group: "U12", opponent: "Rovers", match_date: "2026-10-18", competition: "League",
  event_count: 2, media_id: 3, duration_s: 3600, thumbnail_url: "/api/media/3/thumbnail",
  offline: true,
};

afterEach(() => vi.unstubAllGlobals());

describe("LibraryPage", () => {
  it("shows a card per match with its key facts and links to the detail page", async () => {
    stubFetch({
      "/api/matches": { total: 1, page: 1, page_size: 24, items: [match] },
      "/api/stats": stats,
      "/api/preferences": { primary_player_id: null },
      "/api/teams": [{ id: 1, name: "Riverside U12" }],
      "/api/seasons": [{ id: 1, name: "2026/27" }],
    });
    renderWithProviders(<LibraryPage />);
    const grid = await screen.findByRole("region", { name: "All matches" });
    const link = await within(grid).findByRole("link", { name: /Riverside U12 vs Rovers/ });
    expect(link).toHaveAttribute("href", "/matches/7");
    expect(within(link).getByText("2 moments")).toBeInTheDocument();
    expect(within(link).getByText("1:00:00")).toBeInTheDocument();
    expect(within(link).getByText("Offline")).toBeInTheDocument();
  });

  it("shows overview tiles from the stats API, not invented numbers", async () => {
    stubFetch({
      "/api/matches": { total: 1, page: 1, page_size: 24, items: [match] },
      "/api/stats": { ...stats, matches: 12, moments: 340, footage_seconds: 5400 },
      "/api/preferences": { primary_player_id: null },
      "/api/teams": [],
      "/api/seasons": [],
    });
    renderWithProviders(<LibraryPage />);
    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("1.5")).toBeInTheDocument();
  });

  it("links a recent moment straight to that moment in its match", async () => {
    stubFetch({
      "/api/matches": { total: 1, page: 1, page_size: 24, items: [match] },
      "/api/stats": stats,
      "/api/preferences": { primary_player_id: null },
      "/api/teams": [],
      "/api/seasons": [],
    });
    renderWithProviders(<LibraryPage />);
    const recent = await screen.findByRole("region", { name: "Recent moments" });
    expect(await within(recent).findByRole("link", { name: /Save/ })).toHaveAttribute("href", "/matches/7?moment=11");
  });

  it("shows an empty state pointing to Import when there are no matches", async () => {
    stubFetch({
      "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
      "/api/stats": { ...stats, matches: 0, moments: 0, top_tags: [], recent_moments: [] },
      "/api/teams": [],
      "/api/seasons": [],
    });
    renderWithProviders(<LibraryPage />);
    expect(await screen.findByText(/No matches yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Import a match/ })).toHaveAttribute("href", "/import");
  });
});
