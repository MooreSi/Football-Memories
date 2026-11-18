import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";

/** Hosted gateway (owner decision 011, 2026-11-18): a hosted user's copy cannot use the desktop
 *  helper. Until each user can connect their own Hudl and Veo (phase 2), the copy says so plainly
 *  and shows no Hudl/Veo control that cannot work. The owner's own install is unchanged. */

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); localStorage.clear(); });

const ROUTES = {
  "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
  "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
  "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [], "/api/notes": [],
  "/api/settings/home-teams": { hudl: null, veo: null },
};

async function load(hosted: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  const calls = stubFetch(ROUTES);
  return { calls, ...(await import("./LibraryPage")), ...(await import("../App")) };
}

it("the hosted Library shows no Hudl or Veo control and points to Import", async () => {
  const { calls, LibraryPage } = await load(true);
  renderWithProviders(<LibraryPage />);
  const note = await screen.findByRole("region", { name: "Hudl and Veo" });
  expect(note).toHaveTextContent(/your own Hudl or Veo account/i);
  expect(screen.getByRole("link", { name: "Import a match" })).toHaveAttribute("href", "/import");
  expect(screen.queryByText("Connected Hudl")).toBeNull();
  expect(screen.queryByText("Connected Veo")).toBeNull();
  expect(screen.queryByRole("button", { name: /Retry connection|Refresh Hudl|Refresh Veo/ })).toBeNull();
  await new Promise((r) => setTimeout(r, 50));
  expect(calls.filter((u: string) => u.includes("8766") || u.includes("/helper"))).toEqual([]);
});

it("the owner's own Library still shows Hudl and Veo (negative control)", async () => {
  const { LibraryPage } = await load(false);
  renderWithProviders(<LibraryPage />);
  expect(await screen.findByText("Connected Hudl")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Hudl and Veo" })).toBeNull();
});

it("the hosted navigation has no Downloaded page, and its address shows the note", async () => {
  const { App } = await load(true);
  renderWithProviders(<App />, "/downloaded");
  expect(await screen.findByRole("region", { name: "Hudl and Veo" })).toBeInTheDocument();
  const nav = screen.getByRole("navigation", { name: "Main" });
  expect(nav).not.toHaveTextContent("Downloaded");
  expect(nav).toHaveTextContent("Import");
});

it("the owner's navigation keeps Downloaded (negative control)", async () => {
  const { App } = await load(false);
  renderWithProviders(<App />, "/import");
  expect(screen.getByRole("navigation", { name: "Main" })).toHaveTextContent("Downloaded");
});
