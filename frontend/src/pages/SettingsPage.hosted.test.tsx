import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

/** Task 080: a hosted copy shows no Connections (Hudl/Veo helper) or Update (desktop
 *  updater) tab, since neither can work there (no control that does nothing). */

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function tabs(hosted: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  const { SettingsLayout } = await import("./SettingsPage");
  render(<MemoryRouter><SettingsLayout /></MemoryRouter>);
  return screen.getAllByRole("link").map((a) => a.textContent?.trim());
}

it("hides the helper-only tabs in a hosted build", async () => {
  expect(await tabs(true)).toEqual(["Playback", "Storage", "Backups"]);
});

it("keeps every tab on the owner's own install (negative control)", async () => {
  expect(await tabs(false)).toEqual(["Playback", "Storage", "Backups", "Connections", "Update"]);
});
