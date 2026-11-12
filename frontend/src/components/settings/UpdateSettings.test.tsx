import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { UpdateBadge, UpdateSettings } from "./UpdateSettings";

const H = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());
const available = { current: "a".repeat(40), latest: "b".repeat(40), behind: 3, update_available: true,
  latest_message: "Add highlight reels", latest_date: "2026-11-10T12:00:00+00:00", checked_at: 0 };

it("shows the running and latest versions and updates on request", async () => {
  stubFetch({ [`${H}/update/check`]: available, [`${H}/update/apply`]: { accepted: true }, [`${H}/update/status`]: { state: "idle", message: "" } });
  renderWithProviders(<UpdateSettings />);
  expect(await screen.findByText(/3 updates available/)).toBeInTheDocument();
  expect(screen.getByText("aaaaaaa")).toBeInTheDocument();
  expect(screen.getByText(/Add highlight reels/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Update now" }));
  expect(vi.mocked(fetch).mock.calls.some(([u, init]) => String(u) === `${H}/update/apply` && init?.method === "POST")).toBe(true);
});

it("says when the app is up to date", async () => {
  stubFetch({ [`${H}/update/check`]: { ...available, behind: 0, update_available: false, latest: "a".repeat(40) }, [`${H}/update/status`]: { state: "idle", message: "" } });
  renderWithProviders(<UpdateSettings />);
  expect(await screen.findByText(/up to date/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Update now" })).toBeNull();
});

it("explains how to update without the desktop helper", async () => {
  stubFetch({});
  renderWithProviders(<UpdateSettings />);
  expect(await screen.findByText(/desktop helper is not running/)).toBeInTheDocument();
  expect(screen.getByText("Install Football Memories.command")).toBeInTheDocument();
  expect(screen.getByText("Install Football Memories.bat")).toBeInTheDocument();
});

it("shows the helper's reason when a downloaded copy cannot be linked to GitHub", async () => {
  // Owner report 2026-11-12: a ZIP copy is linked to GitHub on the first check; if that
  // fails the helper says why, and the page must not claim the helper is not running.
  const reason = "Could not reach GitHub to set up updates. Check the internet connection and try again.";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: reason }), { status: 400 })));
  renderWithProviders(<UpdateSettings />);
  expect(await screen.findByText(reason)).toBeInTheDocument();
  expect(screen.queryByText(/desktop helper is not running/)).toBeNull();
  expect(screen.getByText("Install Football Memories.command")).toBeInTheDocument();
});

it("flashes in the header only when an update is available", async () => {
  stubFetch({ [`${H}/update/check`]: available });
  renderWithProviders(<UpdateBadge />);
  expect(await screen.findByRole("link", { name: "Update available" })).toHaveAttribute("href", "/settings/update");
});

it("stays hidden when up to date", async () => {
  stubFetch({ [`${H}/update/check`]: { ...available, update_available: false } });
  renderWithProviders(<UpdateBadge />);
  await new Promise((r) => setTimeout(r, 50));
  expect(screen.queryByRole("link", { name: "Update available" })).toBeNull();
});
