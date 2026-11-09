import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerMoment, PlayerProfile } from "../api/types";
import { renderWithProviders, stubFetch } from "../test/render";
import { PlayerHubPage } from "./PlayerHubPage";
import { PlayerPage } from "./PlayerPage";

afterEach(() => vi.unstubAllGlobals());

const profile: PlayerProfile = {
  id: 5, display_name: "Sam Example", shirt_number: "1", position: "Goalkeeper", is_primary: false,
  totals: { matches: 2, moments: 4, unwatched: 3, favourites: 1 },
  categories: [{ name: "Save", count: 2 }, { name: "GK Claim", count: 1 }, { name: "GK Distribution", count: 1 }],
  teams: [{ team_name: "Riverside", season_label: "2026/27", age_group: "U12", matches: 2 }],
  per_match: [
    { match_id: 1, match_date: "2026-10-18", opponent: "Rovers", moments: 1 },
    { match_id: 2, match_date: "2026-11-01", opponent: "City", moments: 3 },
  ],
  teammates: [{ id: 6, display_name: "Alex Sample", shared_moments: 1 }],
  first_match_date: "2026-10-18", latest_match_date: "2026-11-01",
};

const moment: PlayerMoment = {
  event_id: 11, match_id: 2, time_s: 64, duration_s: 0, category: "Save", players: ["Sam Example"],
  note: "fingertip save", favourite: true, viewed: false, team_name: "Riverside", opponent: "City",
  match_date: "2026-11-01", season_label: "2026/27", age_group: "U12", media_id: 2,
  stream_url: "/api/media/2/stream", thumbnail_url: null, match_duration_s: 150,
};

function renderHub() {
  return renderWithProviders(
    <Routes><Route path="/player/:id" element={<PlayerHubPage />} /></Routes>,
    "/player/5",
  );
}

describe("PlayerHubPage", () => {
  it("shows the player card with tag counts labelled as tag counts", async () => {
    stubFetch({ "/api/players/5": profile, "/api/players/5/moments": { total: 1, items: [moment] } });
    renderHub();
    const card = await screen.findByRole("figure", { name: "Sam Example player card" });
    expect(within(card).getByText("SAV")).toBeInTheDocument();
    expect(within(card).getByText("GKC")).toBeInTheDocument();
    expect(within(card).getByText(/Tag counts, not ratings/)).toBeInTheDocument();
  });

  it("lists team history, teammates and links first and latest games", async () => {
    stubFetch({ "/api/players/5": profile, "/api/players/5/moments": { total: 1, items: [moment] } });
    renderHub();
    expect(await screen.findByText("U12 · 2026/27")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Alex Sample/ })).toHaveAttribute("href", "/player/6");
    expect(screen.getByRole("link", { name: /First archived game/ })).toHaveAttribute("href", "/matches/1");
    expect(screen.getByRole("link", { name: /Latest game/ })).toHaveAttribute("href", "/matches/2");
  });

  it("groups the memories timeline by season and links each moment", async () => {
    stubFetch({ "/api/players/5": profile, "/api/players/5/moments": { total: 1, items: [moment] } });
    renderHub();
    const timeline = await screen.findByRole("region", { name: "Memories timeline" });
    expect(await within(timeline).findByText("Season 2026/27")).toBeInTheDocument();
    expect(within(timeline).getByRole("link", { name: /1:04 Save/ })).toHaveAttribute("href", "/matches/2?moment=11");
  });

  it("offers to make this the primary player and sends the request", async () => {
    const calls = stubFetch({
      "/api/players/5": profile, "/api/players/5/moments": { total: 1, items: [moment] },
      "/api/preferences/primary-player": { primary_player_id: 5 },
    });
    renderHub();
    await userEvent.click(await screen.findByRole("button", { name: /Make this my player/ }));
    expect(calls).toContain("/api/preferences/primary-player");
  });
});

describe("PlayerPage", () => {
  it("lists players to choose from when no primary player is set", async () => {
    stubFetch({
      "/api/preferences": { primary_player_id: null },
      "/api/players": [{ id: 5, display_name: "Sam Example", shirt_number: null, position: null, moments: 4, matches: 2 }],
    });
    renderWithProviders(<PlayerPage />, "/player");
    expect(await screen.findByText("Choose your player")).toBeInTheDocument();
    expect(screen.getByText("4 moments · 2 matches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose" })).toBeInTheDocument();
  });
});
