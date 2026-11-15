import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders, stubFetch } from "../test/render";
import { OpponentsPage } from "./OpponentsPage";

// Owner request 2026-11-15: "add opponents to the match profile for veo and provide match
// stats like you do with hudl". With Hudl hidden and Veo shown, Opponents is built from the
// Veo matches, one club at a time (the Veo account films more than one). Synthetic data.
const H = "http://127.0.0.1:8766";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
// One row per opponent (each row's games are list items of their own).
const opponentRows = () => [...screen.getByRole("list", { name: "Opponents" }).querySelectorAll<HTMLElement>(":scope > [role=listitem]")];
const stats = (shots: [number, number], corners: [number, number]) => ({
  stats: { total_attempts: { own: shots[0], opponent: shots[1] }, corners: { own: corners[0], opponent: corners[1] } }, events: [] });
const veo = (id: string, title: string, season: string, ours: number, theirs: number, team_data: unknown = null) => ({
  id, source: "veo", title, age_group: "Unclassified", season_label: season, available: true, score: { ours, theirs }, moments: [], team_data });

function render(url = "/opponents") {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["hudl"]));
  stubFetch({
    [`${H}/library`]: [], [`${H}/account`]: { configured: true, state: "ready", busy: false },
    [`${H}/veo/library`]: [
      veo("v1", "261108 RJ vs Northgate", "2026/27", 4, 2, stats([10, 6], [5, 1])),
      veo("v2", "260301 RJ vs Northgate", "2025/26", 0, 1, stats([3, 9], [2, 4])),
      veo("v3", "261101 RJ vs Town", "2026/27", 1, 1),
      veo("v4", "261025 HT vs Northgate", "2026/27", 0, 3),
      veo("v5", "261018 HT vs City", "2026/27", 2, 0),
    ],
    [`${H}/veo/account`]: { configured: true, state: "ready", busy: false, message: "", summary: null },
    "/api/settings/home-teams": { hudl: null, veo: "Riverside Juniors" }, "/api/preferences": { primary_player_id: null }, "/api/players": [], "/api/scores": {},
  });
  renderWithProviders(<Routes><Route path="/opponents" element={<OpponentsPage />} /></Routes>, url);
}

it("lists the Veo team's record against each club, with Veo's stats and links to the Veo matches", async () => {
  render();
  const club = await screen.findByRole("combobox", { name: "Club" });
  expect(club).toHaveValue("Riverside Juniors");
  const rows = opponentRows();
  expect(rows).toHaveLength(2); // Northgate (both seasons) and Town; not the other club's games
  expect(rows[0]).toHaveTextContent(/Northgate.*2.*1.*0.*1.*4-3/);
  await userEvent.click(within(rows[0]).getByText("Northgate", { selector: "span" }));
  expect(within(rows[0]).getByText("Shots on goal 13-15 · Corners 7-5")).toBeInTheDocument();
  expect(within(rows[0]).getByRole("link", { name: /261108 RJ vs Northgate/ })).toHaveAttribute("href", "/veo/v1");
  expect(screen.queryByRole("combobox", { name: "Age group" })).toBeNull(); // Veo titles seldom name one
});

it("opens on the club and season asked for, and the season narrows the record", async () => {
  render("/opponents?club=HT");
  const club = await screen.findByRole("combobox", { name: "Club" });
  expect(club).toHaveValue("HT");
  expect(opponentRows().map((r) => r.textContent)).toEqual([
    expect.stringMatching(/^City/), expect.stringMatching(/^Northgate/)]);
  await userEvent.selectOptions(club, "Riverside Juniors");
  await userEvent.selectOptions(screen.getByRole("combobox", { name: "Season" }), "2025/26");
  const rows = opponentRows();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toHaveTextContent(/Northgate.*1.*0.*0.*1.*0-1/);
});
