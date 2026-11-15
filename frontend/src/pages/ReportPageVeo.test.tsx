import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders, stubFetch } from "../test/render";
import { ReportPage } from "./ReportPage";

// Owner request 2026-11-15: with Hudl hidden and Veo shown, the season report is built
// from the Veo matches, and shows games played, won, drawn and lost. Synthetic data.
const H = "http://127.0.0.1:8766";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const veo = (id: string, title: string, season: string, ours: number, theirs: number) => ({
  id, source: "veo", title, age_group: "Unclassified", season_label: season, available: true, score: { ours, theirs }, moments: [] });

it("builds the season report from Veo matches when only Veo is shown", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  stubFetch({
    [`${H}/library`]: [], [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: [veo("v1", "261108 RJ vs Northgate CB", "2026/27", 4, 2), veo("v2", "261101 RJ vs Town", "2026/27", 1, 1),
      veo("v3", "261025 RJ vs City", "2026/27", 0, 2), veo("v4", "260301 RJ vs Old", "2025/26", 5, 0)],
    [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
    "/api/settings/home-teams": { hudl: null, veo: "RJ" }, "/api/preferences": { primary_player_id: null }, "/api/players": [], "/api/scores": {},
  });
  renderWithProviders(<Routes><Route path="/report/season" element={<ReportPage kind="season" />} /></Routes>, "/report/season");
  const card = await screen.findByRole("img", { name: /2026\/27/ });
  expect(card).toHaveTextContent("W1 D1 L1");
  for (const [label, n] of [["PLAYED", "3"], ["WON", "1"], ["DRAWN", "1"], ["LOST", "1"]]) {
    expect(card.querySelector(`[data-record="${label}"]`)).toHaveTextContent(n);
  }
  expect(screen.getByRole("combobox", { name: "Season" })).toHaveValue("2026/27");
});

it("splits the Veo season report by club, starting on the Veo team", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  stubFetch({
    [`${H}/library`]: [], [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: [{ ...veo("v1", "261108 RJ vs Northgate CB", "2026/27", 4, 2), team: "Hill Town" }, veo("v2", "261101 HT vs Town", "2026/27", 1, 1),
      veo("v3", "261025 HT vs City", "2026/27", 0, 2), veo("v4", "261024 Hill Town vs. RJ", "2026/27", 3, 0)],
    [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
    "/api/settings/home-teams": { hudl: null, veo: "Riverside Juniors" }, "/api/preferences": { primary_player_id: null }, "/api/players": [], "/api/scores": {},
  });
  // Veo's team field names the other club on v1; the title wins.
  renderWithProviders(<Routes><Route path="/report/season" element={<ReportPage kind="season" />} /></Routes>, "/report/season");
  const pick = await screen.findByRole("combobox", { name: "Club" });
  expect(pick).toHaveValue("Riverside Juniors");
  let card = screen.getByRole("img", { name: /2026\/27/ });
  expect(card).toHaveTextContent("Riverside Juniors");
  expect(card.querySelector('[data-record="PLAYED"]')).toHaveTextContent("1");
  await userEvent.setup().selectOptions(pick, "Hill Town");
  card = screen.getByRole("img", { name: /2026\/27/ });
  expect(card).toHaveTextContent("Hill Town");
  expect(card).toHaveTextContent("W1 D1 L1");
  expect(card.querySelector('[data-record="PLAYED"]')).toHaveTextContent("3");
});

// Owner request 2026-11-15: the season card lists the games won and lost.
it("lists the games won and lost on the season card", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  stubFetch({
    [`${H}/library`]: [], [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: [veo("v1", "261108 RJ vs Northgate CB", "2026/27", 4, 2), veo("v3", "261025 RJ vs City", "2026/27", 0, 2)],
    [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
    "/api/settings/home-teams": { hudl: null, veo: "RJ" }, "/api/preferences": { primary_player_id: null }, "/api/players": [], "/api/scores": {},
  });
  renderWithProviders(<Routes><Route path="/report/season" element={<ReportPage kind="season" />} /></Routes>, "/report/season");
  const card = await screen.findByRole("img", { name: /2026\/27/ });
  expect(card.querySelector('[data-results="won"]')).toHaveTextContent(/Won \(1\).*Northgate CB 4-2/);
  expect(card.querySelector('[data-results="lost"]')).toHaveTextContent(/Lost \(1\).*City 0-2/);
  expect(card.querySelector('[data-results="drawn"]')).toBeNull();
});

// Owner request 2026-11-15: a Veo match report shows Veo's team stats.
it("shows Veo's team stats on a Veo match report", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  const teamData = { stats: { goals: { own: 4, opponent: 2 }, total_attempts: { own: 9, opponent: 5 }, corners: { own: 3, opponent: 1 }, fouls: { own: 2, opponent: 4 } }, events: [] };
  stubFetch({
    [`${H}/library`]: [], [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: [{ ...veo("v1", "261108 RJ vs Northgate CB", "2026/27", 4, 2), team_data: teamData }],
    [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
    "/api/settings/home-teams": { hudl: null, veo: "RJ" }, "/api/preferences": { primary_player_id: null }, "/api/players": [], "/api/scores": {},
  });
  renderWithProviders(<Routes><Route path="/report/match/:id" element={<ReportPage kind="match" />} /></Routes>, "/report/match/v1");
  const card = await screen.findByRole("img", { name: /RJ v Northgate CB/ });
  for (const text of ["Shots on goal9 - 5", "Corners3 - 1", "Fouls2 - 4", "Penalties0 - 0"]) expect(card).toHaveTextContent(text);
});
