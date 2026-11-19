import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

/** Hosted gateway phase 2 (owner sign-off 2026-11-19; rewritten from task 080): a hosted copy
 *  shows Connections (where a user confirms permission and saves their own Hudl/Veo account)
 *  but never Update, the desktop updater. */

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function tabs(hosted: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_FM_HOSTED", hosted ? "1" : "");
  const { SettingsLayout } = await import("./SettingsPage");
  render(<MemoryRouter><SettingsLayout /></MemoryRouter>);
  return screen.getAllByRole("link").map((a) => a.textContent?.trim());
}

it("a hosted build shows Connections but not Update", async () => {
  expect(await tabs(true)).toEqual(["Playback", "Storage", "Backups", "Connections"]);
});

it("keeps every tab on the owner's own install (negative control)", async () => {
  expect(await tabs(false)).toEqual(["Playback", "Storage", "Backups", "Connections", "Update"]);
});
