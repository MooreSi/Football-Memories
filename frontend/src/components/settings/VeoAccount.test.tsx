import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders, stubFetch } from "../../test/render";
import { VeoAccount } from "./VeoAccount";

// Spec 250: the Veo account card. The password only goes to the desktop helper.
const BASE = "http://127.0.0.1:8766";
const idle = { configured: false, busy: false, state: "idle", message: "", summary: null, secret_store: "macOS Keychain" };
afterEach(() => vi.unstubAllGlobals());
const body = (path: string) => JSON.parse(String(vi.mocked(fetch).mock.calls.filter(([u]) => u === `${BASE}${path}`).at(-1)?.[1]?.body));

it("saves the Veo account in the secret store and clears the password", async () => {
  stubFetch({ [`${BASE}/veo/account`]: idle, [`${BASE}/veo/credentials`]: { saved: true } });
  const user = userEvent.setup();
  renderWithProviders(<VeoAccount />);
  await user.type(await screen.findByLabelText("Veo email"), "parent@example.test");
  await user.type(screen.getByLabelText("Veo password"), "FAKE_SECRET");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText(/Saved in this Mac’s Keychain/)).toBeInTheDocument();
  expect(screen.getByLabelText("Veo password")).toHaveValue("");
  expect(body("/veo/credentials")).toEqual({ username: "parent@example.test", password: "FAKE_SECRET" });
});

it("tests and refreshes the saved account and shows what it found", async () => {
  stubFetch({
    [`${BASE}/veo/account`]: { ...idle, configured: true, state: "ready", message: "Connected to Veo: 238 matches in 1 club, 56 with video, 182 expired.",
      summary: { clubs: 1, matches: 238, with_video: 56, expired: 182, expiring: 7 } },
    [`${BASE}/veo/action`]: { accepted: true },
  });
  const user = userEvent.setup();
  renderWithProviders(<VeoAccount />);
  await user.click(await screen.findByRole("button", { name: "Test" }));
  expect(body("/veo/action")).toEqual({ action: "test" });
  await user.click(screen.getByRole("button", { name: /Refresh matches/ }));
  expect(body("/veo/action")).toEqual({ action: "refresh" });
  const found = screen.getByRole("list", { name: "What the Veo account has" });
  expect(found).toHaveTextContent("238 matches");
  expect(found).toHaveTextContent("56 with video");
  expect(found).toHaveTextContent("182 expired");
});

it("cannot test before an account is saved, and names Credential Manager on Windows", async () => {
  stubFetch({ [`${BASE}/veo/account`]: { ...idle, secret_store: "Windows Credential Manager" } });
  renderWithProviders(<VeoAccount />);
  expect(await screen.findByRole("button", { name: "Test" })).toBeDisabled();
  expect(screen.getByText(/Saved only in Windows Credential Manager/)).toBeInTheDocument();
});
