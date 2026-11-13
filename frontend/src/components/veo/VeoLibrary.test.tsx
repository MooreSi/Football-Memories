import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { VeoLibrary } from "./VeoLibrary";

// Spec 260 task 1: Veo matches from the helper's cache in All matches. Synthetic data.
const LIB = "http://127.0.0.1:8766/veo/library";
const matches = [
  { id: "veo-a", source: "veo", title: "260901 Riverside U11 vs Rovers", age_group: "U11", age_groups: ["U11"], season_label: "2026/27",
    available: true, expiration_status: "does-not-expire-soon", score: { ours: 3, theirs: 1 }, moments: [{ id: "h1", category: "GOAL", time_s: 60, duration_s: 10 }] },
  { id: "veo-b", source: "veo", title: "250301 Riverside U10 vs City", age_group: "U10", age_groups: ["U10"], season_label: "2024/25",
    available: false, expiration_status: "expired", score: null, moments: [] },
  { id: "veo-c", source: "veo", title: "261001 Riverside U11 vs Town", age_group: "U11", age_groups: ["U11"], season_label: "2026/27",
    available: true, expiration_status: "expires-soon", score: null, moments: [] },
];
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it("lists cached Veo matches with links, score and expiry, filtered like All matches", async () => {
  stubFetch({ [LIB]: matches });
  renderWithProviders(<VeoLibrary filters={{ age: "U11", season: "", search: "" }} />);
  const a = await screen.findByRole("link", { name: /Rovers/ });
  expect(a).toHaveAttribute("href", "/veo/veo-a");
  expect(a).toHaveTextContent("3–1");
  expect(a).toHaveTextContent("1 highlight");
  expect(within(screen.getByRole("link", { name: /Town/ })).getByText("Video expires soon on Veo")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /City/ })).toBeNull();
  expect(screen.getByText(/2 of 3 cached Veo matches/)).toBeInTheDocument();
});

it("marks a match whose video Veo has expired", async () => {
  stubFetch({ [LIB]: matches });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "City" }} />);
  const b = await screen.findByRole("link", { name: /City/ });
  expect(within(b).getByText("Video expired on Veo")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Rovers/ })).toBeNull();
});

it("shows nothing when Settings has Show Veo off, and an empty cache explains Refresh", async () => {
  localStorage.setItem("fm.connections.hidden", JSON.stringify(["veo"]));
  stubFetch({ [LIB]: matches });
  const { unmount } = renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  expect(screen.queryByRole("region", { name: "Veo match library" })).toBeNull();
  unmount();
  localStorage.clear();
  stubFetch({ [LIB]: [] });
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  expect(await screen.findByText(/Refresh matches in Settings/)).toBeInTheDocument();
});

it("says the helper is unavailable without inventing matches", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
  renderWithProviders(<VeoLibrary filters={{ age: "", season: "", search: "" }} />);
  await screen.findByText(/Veo matches unavailable/);
  expect(screen.queryAllByRole("link")).toHaveLength(0);
  await userEvent.setup().click(screen.getByRole("button", { name: "Retry connection" }));
});
