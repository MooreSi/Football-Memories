import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";

/** Hosted gateway phase 2 (owner sign-off 2026-11-19; rewritten from the phase 1 "no Hudl or
 *  Veo at all"): a hosted Library shows Hudl or Veo only after the user has confirmed their
 *  own permission for it; until then one note points to Settings, Connections, and nothing
 *  is sent to the helper. Never the owner's helper address. */

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); localStorage.clear(); });

const BASE = {
  "/api/matches": { total: 0, page: 1, page_size: 24, items: [] },
  "/api/stats": { matches: 0, moments: 0, footage_seconds: 0, teams: 0, players: 0, top_tags: [], recent_moments: [] },
  "/api/preferences": { primary_player_id: null }, "/api/teams": [], "/api/seasons": [], "/api/notes": [],
  "/api/settings/home-teams": { hudl: null, veo: null },
};
const ORIGIN = window.location.origin;

async function load(hosted: boolean, perms?: { hudl: boolean; veo: boolean }) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  const calls = stubFetch({
    ...BASE,
    "/_portal/api/connections": {
      wording: "I have permission.",
      hudl: { confirmed_at: perms?.hudl ? "2026-11-19T10:00:00Z" : null },
      veo: { confirmed_at: perms?.veo ? "2026-11-19T10:00:00Z" : null },
    },
    [`${ORIGIN}/helper/library`]: [], [`${ORIGIN}/helper/account`]: { configured: false, state: "idle", busy: false },
  });
  return { calls, ...(await import("./LibraryPage")), ...(await import("../App")) };
}

const helperCalls = (calls: string[]) => calls.filter((u) => u.includes("8766") || u.includes("/helper"));

it("before permission the hosted Library points to Connections and calls no helper", async () => {
  const { calls, LibraryPage } = await load(true);
  renderWithProviders(<LibraryPage />);
  const note = await screen.findByRole("region", { name: "Hudl and Veo" });
  expect(note).toHaveTextContent(/your own Hudl or Veo account/i);
  expect(screen.getByRole("link", { name: "Connect Hudl or Veo" })).toHaveAttribute("href", "/settings/connections");
  expect(screen.queryByText("Connected Hudl")).toBeNull();
  await new Promise((r) => setTimeout(r, 50));
  expect(helperCalls(calls)).toEqual([]);
});

it("after Hudl permission the hosted Library shows Hudl through its own /helper only", async () => {
  const { calls, LibraryPage } = await load(true, { hudl: true, veo: false });
  renderWithProviders(<LibraryPage />);
  expect(await screen.findByText("Connected Hudl")).toBeInTheDocument();
  expect(screen.queryByText("Connected Veo")).toBeNull();
  await new Promise((r) => setTimeout(r, 50));
  const used = helperCalls(calls);
  expect(used.length).toBeGreaterThan(0);
  expect(used.every((u) => u.startsWith(`${ORIGIN}/helper/`) && !u.includes("/helper/veo"))).toBe(true);
});

it("the owner's own Library shows Hudl and Veo without any permission step (negative control)", async () => {
  const { LibraryPage } = await load(false);
  renderWithProviders(<LibraryPage />);
  expect(await screen.findByText("Connected Hudl")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Hudl and Veo" })).toBeNull();
});

it("the hosted navigation shows Downloaded only once a service is confirmed", async () => {
  const before = await load(true);
  const first = renderWithProviders(<before.App />, "/import");
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.getByRole("navigation", { name: "Main" })).not.toHaveTextContent("Downloaded");
  first.unmount();
  const after = await load(true, { hudl: true, veo: false });
  renderWithProviders(<after.App />, "/import");
  await vi.waitFor(() => expect(screen.getByRole("navigation", { name: "Main" })).toHaveTextContent("Downloaded"));
});
