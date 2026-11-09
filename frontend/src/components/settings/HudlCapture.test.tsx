import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { HudlCapture } from "./HudlCapture";

const BASE = "http://127.0.0.1:8766";
afterEach(() => vi.unstubAllGlobals());

describe("HudlCapture", () => {
  it("starts a capture with a match URL, chosen quality and explicit player codes", async () => {
    stubFetch({
      [`${BASE}/status`]: { state: "idle", message: "Ready to capture a match.", filename: null },
      [`${BASE}/capture`]: { accepted: true },
    });
    const fetch = vi.mocked(globalThis.fetch);
    const user = userEvent.setup();
    renderWithProviders(<HudlCapture />);
    await screen.findByText("Ready to capture a match.");
    await user.type(screen.getByLabelText("Match URL"), "https://www.hudl.com/watch/video/synthetic-video");
    await user.type(screen.getByLabelText("Player codes (optional)"), "SAM EXAMPLE; ALEX EXAMPLE");
    await user.selectOptions(screen.getByLabelText("Maximum quality"), "540");
    await user.click(screen.getByRole("button", { name: "Capture match" }));
    const post = fetch.mock.calls.find(([url, init]) => url === `${BASE}/capture` && init?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      url: "https://www.hudl.com/watch/video/synthetic-video", max_height: 540,
      player_codes: ["SAM EXAMPLE", "ALEX EXAMPLE"],
    });
  });

  it("rejects a transaction login URL before sending it to the helper", async () => {
    stubFetch({ [`${BASE}/status`]: { state: "idle", message: "Ready", filename: null } });
    const fetch = vi.mocked(globalThis.fetch);
    const user = userEvent.setup();
    renderWithProviders(<HudlCapture />);
    await screen.findByText("Ready");
    await user.type(screen.getByLabelText("Match URL"), "https://identity.hudl.com/u/login/identifier?state=FAKE_SECRET");
    await user.click(screen.getByRole("button", { name: "Capture match" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Use the match page URL");
    expect(fetch.mock.calls.some(([url]) => url === `${BASE}/capture`)).toBe(false);
  });

  it("offers import only after the capture is complete", async () => {
    stubFetch({ [`${BASE}/status`]: { state: "done", message: "Verified", filename: "synthetic.mp4" } });
    renderWithProviders(<HudlCapture />);
    expect(await screen.findByRole("link", { name: "Import captured match" })).toHaveAttribute("href", "/import");
  });
});
