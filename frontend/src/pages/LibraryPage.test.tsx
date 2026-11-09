import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { LibraryPage } from "./LibraryPage";
import type { MatchSummary } from "../api/types";

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
      "/api/teams": [{ id: 1, name: "Riverside U12" }],
      "/api/seasons": [{ id: 1, name: "2026/27" }],
    });
    renderWithProviders(<LibraryPage />);
    const link = await screen.findByRole("link", { name: /Riverside U12 vs Rovers/ });
    expect(link).toHaveAttribute("href", "/matches/7");
    expect(screen.getByText("2 moments")).toBeInTheDocument();
    expect(screen.getByText("1:00:00")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("shows an empty state pointing to Import when there are no matches", async () => {
    stubFetch({
      "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
      "/api/teams": [],
      "/api/seasons": [],
    });
    renderWithProviders(<LibraryPage />);
    expect(await screen.findByText(/No matches yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Import a match/ })).toHaveAttribute("href", "/import");
  });
});
