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
  it("tests the saved connection and offers stream/download for cached matches", async () => {
    stubFetch({ [`${BASE}/account`]: { ...status, configured: true, matches: [
      { id: "synthetic-a", title: "Team A vs B", url: "https://www.hudl.com/watch/video/synthetic-a" },
    ] }, [`${BASE}/account/action`]: { accepted: true } });
    const user = userEvent.setup();
    renderWithProviders(<HudlAccount />);
    await user.click(await screen.findByRole("button", { name: "Test" }));
    expect(screen.getByRole("button", { name: "Stream Team A vs B" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Download Team A vs B" }));
    const calls = vi.mocked(fetch).mock.calls.filter(([url]) => url === `${BASE}/account/action`);
    expect(JSON.parse(String(calls[0][1]?.body))).toEqual({ action: "test" });
    expect(JSON.parse(String(calls[1][1]?.body))).toEqual({ action: "download", match_id: "synthetic-a" });
  });
});
