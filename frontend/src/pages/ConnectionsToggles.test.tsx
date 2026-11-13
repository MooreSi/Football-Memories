import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../test/render";
import { ConnectionsPage } from "./ConnectionsPage";

// Owner request 2026-11-13: show or hide the Hudl and Veo connections.
const BASE = "http://127.0.0.1:8766";
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
function open() {
  stubFetch({
    "/api/connectors": [
      { id: "local_import", name: "Local import", available: true, capabilities: { import_files: true }, reason: null, docs: null, limitations: [] },
      { id: "hudl", name: "Hudl", available: false, capabilities: {}, reason: "Terms", docs: null, limitations: [] },
    ],
    [`${BASE}/account`]: { configured: false, busy: false, state: "idle", message: "", matches: [] },
    [`${BASE}/veo/account`]: { configured: false, busy: false, state: "idle", message: "", summary: null, secret_store: "macOS Keychain" },
  });
  return renderWithProviders(<ConnectionsPage embedded />);
}

it("shows Hudl and Veo, and hides each one with its switch until shown again", async () => {
  const view = open(); const user = userEvent.setup();
  expect(await screen.findByRole("region", { name: "Hudl" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Veo" })).toBeInTheDocument();
  await user.click(screen.getByRole("switch", { name: "Show Veo" }));
  expect(screen.queryByRole("region", { name: "Veo" })).toBeNull();
  expect(screen.getByRole("region", { name: "Hudl" })).toBeInTheDocument();
  await user.click(screen.getByRole("switch", { name: "Show Hudl" }));
  expect(screen.queryByRole("region", { name: "Hudl" })).toBeNull();
  expect(screen.getByRole("region", { name: "Local import" })).toBeInTheDocument();
  view.unmount();
  open();
  expect(await screen.findByRole("switch", { name: "Show Hudl" })).toHaveAttribute("aria-checked", "false");
  expect(screen.queryByRole("region", { name: "Hudl" })).toBeNull();
  await user.click(screen.getByRole("switch", { name: "Show Hudl" }));
  expect(screen.getByRole("region", { name: "Hudl" })).toBeInTheDocument();
});
