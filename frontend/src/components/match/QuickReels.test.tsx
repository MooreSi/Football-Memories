import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { QuickReels } from "./QuickReels";

// Spec 300: one-click reels on a match page. Made-up names.
afterEach(() => vi.unstubAllGlobals());
const t = (id: string, category: string, time_s: number, duration_s = 10) => ({ id, category, time_s, duration_s });
const hudl = { id: "m1", tag_status: "synced" as const, moments: [
  t("p1", "Sam Example", 95), t("g1", "ASTON VILLA GOAL", 100), t("g2", "ASTON VILLA GOAL", 900), t("o1", "OPPOSITION GOAL", 500),
] };

function Studio() {
  return <pre data-testid="state">{JSON.stringify(useLocation().state)}</pre>;
}
const page = (ui: React.ReactElement) => <Routes><Route path="/" element={ui} /><Route path="/clips/reel/new" element={<Studio />} /></Routes>;
const api = { "/api/goals": {}, "/api/preferences": { primary_player_id: 7 }, "/api/players/7": { id: 7, display_name: "Sam Example" } };

it("opens Reel Studio with the preset's moments and name", async () => {
  stubFetch(api);
  renderWithProviders(page(<QuickReels match={hudl} club="Aston Villa" />));
  const row = await screen.findByRole("region", { name: "Quick reels" });
  expect(within(row).getByRole("button", { name: /Sam Example's moments \(1\)/ })).toBeInTheDocument();
  await userEvent.click(within(row).getByRole("button", { name: /Our goals \(2\)/ }));
  expect(JSON.parse(screen.getByTestId("state").textContent!)).toEqual({ name: "Our goals", items: [{ match_id: "m1", moment_ids: ["g1", "g2"] }] });
});

it("sends a Veo preset to the Veo studio", async () => {
  stubFetch(api);
  const veo = { id: "veo-1", source: "veo", available: true, moments: [],
    team_moments: [{ id: "t-own-goal-500000", category: "OUR GOAL", side: "own", time_s: 490, duration_s: 15, team: true }],
    team_data: { stats: {}, events: [{ type: "GOAL", side: "own" as const, time_s: 500, period: 1 }] } };
  renderWithProviders(page(<QuickReels match={veo} club={null} />));
  await userEvent.click(await screen.findByRole("button", { name: /Our goals \(1\)/ }));
  expect(JSON.parse(screen.getByTestId("state").textContent!)).toEqual({ source: "veo", name: "Our goals", items: [{ match_id: "veo-1", moment_ids: ["t-own-goal-500000"] }] });
});

it("shows nothing for a Hudl match without synced tags or a Veo match without video", async () => {
  stubFetch(api);
  const { unmount } = renderWithProviders(page(<QuickReels match={{ ...hudl, tag_status: "unsynced" }} club="Aston Villa" />));
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("region", { name: "Quick reels" })).toBeNull();
  unmount();
  renderWithProviders(page(<QuickReels match={{ id: "veo-2", source: "veo", available: false, team_moments: [], team_data: { stats: {}, events: [] } }} club={null} />));
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("region", { name: "Quick reels" })).toBeNull();
});
