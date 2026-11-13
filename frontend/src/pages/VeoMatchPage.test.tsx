import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { VeoMatchPage } from "./VeoMatchPage";

// Spec 260 task 1: one Veo match from the cache. No player or download control yet.
const LIB = "http://127.0.0.1:8766/veo/library";
const match = {
  id: "veo-a", source: "veo", title: "260901 Riverside U11 vs Rovers", age_group: "U11", season_label: "2026/27", team: "Riverside U11",
  available: true, expiration_status: "does-not-expire-soon", home_or_away: "home", duration_s: 3600, score: { ours: 3, theirs: 1 },
  halves: [[0, 1500], [1800, 3300]],
  moments: [
    { id: "h2", category: "SHOT", time_s: 125, duration_s: 10, ai: true },
    { id: "h1", category: "GOAL", time_s: 61, duration_s: 10, note: "Top corner" },
    { id: "h3", category: "GOAL", time_s: 1900, duration_s: 10 },
  ],
};
afterEach(() => vi.unstubAllGlobals());
const open = (id: string) => renderWithProviders(<Routes><Route path="/veo/:id" element={<VeoMatchPage />} /></Routes>, `/veo/${id}`);

it("shows the match details, halves and Veo highlights by type in match order", async () => {
  stubFetch({ [LIB]: [match] });
  open("veo-a");
  expect(await screen.findByRole("heading", { name: /Riverside U11 vs Rovers/ })).toBeInTheDocument();
  expect(screen.getByText("3–1")).toBeInTheDocument();
  expect(screen.getByText(/Home/)).toBeInTheDocument();
  expect(screen.getByText(/1st half 0:00–25:00/)).toBeInTheDocument();
  const types = screen.getByRole("list", { name: "Highlight types" });
  expect(within(types).getByText("GOAL").closest("li")).toHaveTextContent("2");
  expect(within(types).getByText("SHOT").closest("li")).toHaveTextContent("1");
  const rows = within(screen.getByRole("list", { name: "Veo highlights" })).getAllByRole("listitem");
  expect(rows.map(r => r.textContent)).toEqual([
    expect.stringMatching(/1:01.*GOAL.*Top corner/), expect.stringMatching(/2:05.*SHOT.*Veo AI/), expect.stringMatching(/31:40.*GOAL/),
  ]);
  expect(document.querySelector("video")).toBeNull();
  expect(screen.queryByRole("button", { name: /Download|Watch|Stream/ })).toBeNull();
});

it("explains an expired match and an unknown id", async () => {
  stubFetch({ [LIB]: [{ ...match, available: false, expiration_status: "expired", moments: [] }] });
  const { unmount } = open("veo-a");
  expect(await screen.findByText(/Veo no longer has the video/)).toBeInTheDocument();
  unmount();
  stubFetch({ [LIB]: [match] });
  open("veo-zzz");
  expect(await screen.findByText(/not in the Veo cache/)).toBeInTheDocument();
});
