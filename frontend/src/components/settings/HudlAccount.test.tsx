import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { HudlAccount } from "./HudlAccount";

const BASE = "http://127.0.0.1:8766";
const status = { configured: false, busy: false, state: "idle", message: "Ready", matches: [] };
afterEach(() => vi.unstubAllGlobals());
describe("HudlAccount", () => {
  it("saves credentials through the helper and clears the password field", async () => {
    stubFetch({ [`${BASE}/account`]: status, [`${BASE}/account/credentials`]: { saved: true } });
    const user = userEvent.setup();
    renderWithProviders(<HudlAccount />);
    await user.type(await screen.findByLabelText("Hudl username"), "parent@example.test");
    await user.type(screen.getByLabelText("Hudl password"), "FAKE_SECRET");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Saved in this Mac’s Keychain/)).toBeInTheDocument();
    expect(screen.getByLabelText("Hudl password")).toHaveValue("");
    const call = vi.mocked(fetch).mock.calls.find(([url]) => url === `${BASE}/account/credentials`);
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ username: "parent@example.test", password: "FAKE_SECRET" });
  });
  it("tests the saved connection without a duplicate player or match list", async () => {
    // Owner request 2026-11-10 (spec 190): matches are streamed and downloaded from
    // Library and Clips, so Settings no longer repeats the player and match list.
    stubFetch({ [`${BASE}/account`]: { ...status, configured: true, stream_url: "http://127.0.0.1:8766/stream/x/playlist.m3u8", matches: [
      { id: "synthetic-a", title: "Team A vs B", url: "https://www.hudl.com/watch/video/synthetic-a" },
    ] }, [`${BASE}/account/action`]: { accepted: true } });
    const user = userEvent.setup();
    renderWithProviders(<HudlAccount />);
    await user.click(await screen.findByRole("button", { name: "Test" }));
    const calls = vi.mocked(fetch).mock.calls.filter(([url]) => url === `${BASE}/account/action`);
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({ action: "test" });
    expect(screen.queryByRole("button", { name: "Stream Team A vs B" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Available Hudl matches" })).toBeNull();
    expect(screen.queryByLabelText("Hudl match stream")).toBeNull();
  });
  it("names Windows Credential Manager when the helper runs on Windows", async () => {
    stubFetch({ [`${BASE}/account`]: { ...status, secret_store: "Windows Credential Manager", platform: "windows" }, [`${BASE}/account/credentials`]: { saved: true } });
    const user = userEvent.setup();
    renderWithProviders(<HudlAccount />);
    await user.type(await screen.findByLabelText("Hudl username"), "parent@example.test");
    await user.type(screen.getByLabelText("Hudl password"), "FAKE_SECRET");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/Saved in Windows Credential Manager/)).toBeInTheDocument();
    expect(screen.queryByText(/Keychain/)).toBeNull();
  });
});
