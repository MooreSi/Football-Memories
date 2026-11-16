import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { App } from "../App";
import { HudlMatchPage } from "./HudlMatchPage";

// Spec 320 (owner request 2026-11-16, "implement option A"): under a match's video, a
// match timeline, a summary strip and tabs, Moments first. Synthetic data only.
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const H = "http://127.0.0.1:8766";
const t = (id: string, category: string, time_s: number, duration_s = 0) => ({ id, category, time_s, duration_s });
const hudlMoments = [
  t("p1", "ROVERS POSSESSION", 0, 90), t("p2", "OPPOSITION POSSESSION", 100, 30),
  t("e1", "ROVERS ATTACKING THIRD ENTRY", 20), t("c1", "ROVERS CHANCE", 30), t("k1", "ROVERS CORNER", 40),
  t("g1", "OPPOSITION GOAL", 110), t("c2", "OPPOSITION CHANCE", 105), t("s1", "SAM EXAMPLE", 25, 5),
];
function openHudl(moments = hudlMoments) {
  stubFetch({
    [`${H}/library`]: [{ id: "a", title: "261101 U11 v Derby County", age_group: "U11", tag_status: "synced", moments }],
    [`${H}/account`]: { configured: true, state: "ready", busy: false, match_id: "a", stream_url: `${H}/stream/x/playlist.m3u8` },
    [`${H}/account/action`]: { accepted: true },
    "/api/notes": [], "/api/scores": {}, "/api/watching": { ok: true }, "/api/players": [],
  });
  renderWithProviders(<Routes><Route path="/hudl/:id" element={<HudlMatchPage />} /></Routes>, "/hudl/a");
}
const panelOf = (name: string) => screen.getByRole("tab", { name: new RegExp(`^${name}`) }).getAttribute("aria-controls")!;
const panel = (name: string) => document.getElementById(panelOf(name))!;

it("opens a Hudl match on the Moments tab, with the other sections one tab away", async () => {
  openHudl();
  const tabs = await screen.findByRole("tablist", { name: "Match sections" });
  expect(within(tabs).getAllByRole("tab").map((x) => x.textContent)).toEqual([
    expect.stringMatching(/^Moments/), "Team stats", expect.stringMatching(/^Goals and keepers/), "Insights"]);
  expect(within(tabs).getByRole("tab", { name: /^Moments/ })).toHaveAttribute("aria-selected", "true");
  expect(panel("Moments")).toContainElement(screen.getByRole("region", { name: "Hudl tagged moments" }));
  expect(panel("Moments")).not.toHaveClass("hidden");
  expect(panel("Team stats")).toHaveClass("hidden");
  expect(panel("Team stats")).toContainElement(screen.getByRole("region", { name: "Team stats" }));
  expect(panel("Insights")).toContainElement(screen.getByRole("region", { name: "Match insights" }));
});

it("switches tabs by click and by arrow key", async () => {
  openHudl();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("tab", { name: "Team stats" }));
  expect(screen.getByRole("tab", { name: "Team stats" })).toHaveAttribute("aria-selected", "true");
  expect(panel("Team stats")).not.toHaveClass("hidden");
  expect(panel("Moments")).toHaveClass("hidden");
  await user.keyboard("{ArrowRight}");
  const goals = screen.getByRole("tab", { name: /^Goals and keepers/ });
  expect(goals).toHaveAttribute("aria-selected", "true");
  expect(goals).toHaveFocus();
  await user.keyboard("{End}");
  expect(screen.getByRole("tab", { name: "Insights" })).toHaveAttribute("aria-selected", "true");
  await user.keyboard("{Home}");
  expect(screen.getByRole("tab", { name: /^Moments/ })).toHaveAttribute("aria-selected", "true");
});

it("shows a summary strip and a match timeline above the tabs", async () => {
  openHudl();
  const strip = await screen.findByRole("region", { name: "Match summary" });
  expect(within(strip).getByText("Possession").closest("div")).toHaveTextContent("75–25%");
  expect(within(strip).getByText("Chances").closest("div")).toHaveTextContent("1–1");
  expect(within(strip).getByText("Corners").closest("div")).toHaveTextContent("1–0");
  expect(screen.getByRole("img", { name: "Match timeline" })).toBeInTheDocument();
});

it("leaves out the Team stats tab and the timeline when the tags name no side", async () => {
  openHudl([t("s1", "SAM EXAMPLE", 25, 5), t("s2", "ALEX DEMO", 60, 5)]);
  const tabs = await screen.findByRole("tablist", { name: "Match sections" });
  expect(within(tabs).queryByRole("tab", { name: "Team stats" })).toBeNull();
  expect(screen.queryByRole("img", { name: "Match timeline" })).toBeNull();
  expect(screen.queryByRole("region", { name: "Match summary" })).toBeNull();
});

const veoMatch = {
  id: "veo-a", source: "veo", title: "261108 RJ vs Northgate CB", age_group: "U11", season_label: "2026/27",
  available: true, home_or_away: "home", duration_s: 3300, score: { ours: 2, theirs: 1 }, halves: [[0, 1500], [1800, 3300]],
  moments: [{ id: "h1", category: "SHOT ON GOAL", time_s: 64, duration_s: 20 }, { id: "h2", category: "GOAL", time_s: 300, duration_s: 20 }],
  team_data: {
    stats: { goals: { own: 2, opponent: 1 }, total_attempts: { own: 7, opponent: 3 }, corners: { own: 1, opponent: 4 } },
    events: [{ type: "SHOT", side: "own", time_s: 60, period: 1 }, { type: "GOAL", side: "own", time_s: 300, period: 1 },
      { type: "GOAL", side: "opponent", time_s: 1900, period: 2 }],
  },
};
function openVeo(match: object = veoMatch) {
  stubFetch({ [`${H}/veo/library`]: [match], [`${H}/veo/account`]: { configured: true, busy: false, state: "ready", message: "", summary: null, match_id: "veo-a", stream_url: `${H}/veo/stream/tok` },
    [`${H}/veo/action`]: { accepted: true }, [`${H}/library`]: [], [`${H}/account`]: { configured: false, state: "idle", busy: false },
    "/api/settings/home-teams": { hudl: null, veo: null }, "/api/notes": [] });
  renderWithProviders(<App />, "/veo/veo-a");
}

it("lays out a Veo match the same way", async () => {
  openVeo();
  const tabs = await screen.findByRole("tablist", { name: "Match sections" });
  expect(within(tabs).getAllByRole("tab").map((x) => x.textContent)).toEqual([
    expect.stringMatching(/^Moments/), "Team stats", expect.stringMatching(/^Goals and keepers/), "Insights"]);
  expect(panel("Moments")).toContainElement(screen.getByRole("region", { name: "Veo highlight moments" }));
  expect(panel("Team stats")).toHaveClass("hidden");
  const strip = screen.getByRole("region", { name: "Match summary" });
  expect(within(strip).getByText("Attempts").closest("div")).toHaveTextContent("7–3");
});

it("seeks the Veo video from the match timeline", async () => {
  openVeo();
  const chart = await screen.findByRole("img", { name: "Match timeline" });
  const video = await screen.findByLabelText("Veo match video") as HTMLVideoElement;
  Object.defineProperty(video, "readyState", { configurable: true, value: 4 });
  fireEvent.click(chart.querySelector('rect[data-side="theirs"]')!);
  expect(video.currentTime).toBe(1900);
});

it("has no Team stats tab for a Veo match Veo gave none for", async () => {
  openVeo({ ...veoMatch, team_data: null });
  const tabs = await screen.findByRole("tablist", { name: "Match sections" });
  expect(within(tabs).queryByRole("tab", { name: "Team stats" })).toBeNull();
});
