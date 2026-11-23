import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders, stubFetch } from "../test/render";
import { TournamentReportPage } from "./TournamentReportPage";
import { ReportCard } from "./ReportPage";
import { tournamentReport } from "../lib/tournamentReport";

const H = "http://127.0.0.1:8766";
const cup = { id: "cup", name: "Riverside Cup", entries: { "hudl:same": "Blue", "veo:same": "White", "local:12": "Blue", "hudl:mixed": "Team unassigned" } };
beforeEach(() => vi.stubGlobal("scrollTo", vi.fn()));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
function mount(route = "/report/tournament/cup", overrides: Record<string, unknown> = {}) {
  const calls = stubFetch({
    "/api/tournaments": [cup], "/api/scores": { same: { ours: 3, theirs: 1 } },
    "/api/settings/home-teams": { hudl: "Riverside", veo: "Riverside" }, "/api/preferences": { primary_player_id: null },
    "/api/matches": { items: [] },
    [`${H}/library`]: [{ id: "same", title: "261026 U11 v Town", age_group: "U11", capture_key: "same", moments: [] },
      { id: "mixed", title: "261026 Pitch recording", age_group: "U11", capture_key: "mixed", moments: [] }],
    [`${H}/veo/library`]: [{ id: "same", title: "261026 Riverside v City", age_group: "U11", available: true, source: "veo", score: { ours: 0, theirs: 2 } }],
    "/api/matches/12": { id: 12, team_name: "Riverside U11", opponent: "United", match_date: "2026-10-26", events: [
      { id: 1, category: "RIVERSIDE U11 GOAL", time_s: 1, duration_s: 1, players: [], note: "" } ] },
    ...overrides,
  });
  renderWithProviders(<Routes><Route path="/report/tournament/:id" element={<TournamentReportPage />} /></Routes>, route);
  return calls;
}
it("loads full event membership from each source, applies corrections and filters by squad", async () => {
  const scroll = vi.fn(); vi.stubGlobal("scrollTo", scroll);
  const calls = mount();
  const card = await screen.findByRole("img", { name: /Riverside Cup/ });
  expect(scroll).toHaveBeenCalledWith(0, 0);
  expect(card.querySelector('[data-record="PLAYED"]')).toHaveTextContent("3");
  expect(card.querySelector('[data-record="WON"]')).toHaveTextContent("3");
  expect(card).toHaveTextContent("7 / 2");
  expect(card).toHaveTextContent("Needs review");
  expect(card).toHaveTextContent("United");
  expect(screen.getByRole("article", { name: "Printable tournament report" })).toHaveTextContent("Riverside Cup");
  fireEvent.change(screen.getByRole("combobox", { name: "Squad" }), { target: { value: "Blue" } });
  expect(screen.getByRole("img", { name: /Riverside Cup/ })).not.toHaveTextContent("v City");
  expect(screen.getByRole("img", { name: /Riverside Cup/ }).querySelector('[data-record="PLAYED"]')).toHaveTextContent("2");
  expect(screen.getByRole("button", { name: "Save image" })).toBeEnabled();
  const print = vi.fn(); vi.stubGlobal("print", print);
  fireEvent.click(screen.getByRole("button", { name: "Print / Save as PDF" }));
  expect(print).toHaveBeenCalledOnce();
  expect(calls).not.toContain(`${H}/account/action`);
});
it("opens a direct squad report and keeps hidden sources as unavailable linked games", async () => {
  localStorage.setItem("fm.connections.hidden", '["veo"]');
  mount("/report/tournament/cup?team=White");
  const card = await screen.findByRole("img", { name: /Riverside Cup/ });
  expect(screen.getByRole("combobox", { name: "Squad" })).toHaveValue("White");
  expect(card).toHaveTextContent("0 of 1 assigned games");
  expect(card).toHaveTextContent("Metadata unavailable");
  expect(card.querySelector('[data-record="WON"]')).toHaveTextContent("0");
});
it("shows an actionable error for tournament fetch failure instead of an empty report", async () => {
  stubFetch({});
  renderWithProviders(<Routes><Route path="/report/tournament/:id" element={<TournamentReportPage />} /></Routes>, "/report/tournament/cup");
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load tournaments");
  expect(screen.queryByRole("button", { name: "Save image" })).not.toBeInTheDocument();
});
it("wraps long event titles and squad subtitles in the exported card", () => {
  const name = "Riverside International Football Tournament With A Very Long Event Name";
  renderWithProviders(<ReportCard report={tournamentReport({ id: "cup", name, entries: {} }, [], "Riverside Academy Development Squad Blue")} />);
  const card = screen.getByRole("img");
  expect(card.querySelectorAll('[data-tournament-title] text').length).toBeGreaterThan(1);
  expect(card.querySelectorAll('[data-tournament-subtitle] text').length).toBeGreaterThan(1);
});

it("retains unavailable imported games and still reports the other scored members", async () => {
  mount("/report/tournament/cup", { "/api/matches/12": null });
  const card = await screen.findByRole("img", { name: /Riverside Cup/ });
  expect(card.querySelector('[data-record="PLAYED"]')).toHaveTextContent("3");
  expect(card).toHaveTextContent("2 of 3 assigned games");
  expect(card).toHaveTextContent("local:12 · Metadata unavailable");
  expect(screen.getByRole("alert")).toHaveTextContent("Some cached match details could not be loaded");
});
it("does not offer exports for a deleted tournament", async () => {
  mount("/report/tournament/missing");
  expect(await screen.findByText("This tournament is no longer available.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save image" })).not.toBeInTheDocument();
});
