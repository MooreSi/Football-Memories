import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { UpdateSettings } from "./UpdateSettings";

// Owner request 2026-11-12: once Update now has downloaded and installed the update,
// the app restarts and the page reloads itself onto the new version.
vi.mock("../../lib/reloadPage", () => ({ reloadPage: vi.fn() }));
import { reloadPage } from "../../lib/reloadPage";

const H = "http://127.0.0.1:8766";
const OLD = "a".repeat(40), NEW = "b".repeat(40);
const check = { current: OLD, latest: NEW, behind: 1, update_available: true, latest_message: "Fix", latest_date: null, checked_at: 0 };

type Phase = { version: string | "down"; status: { state: string; message: string } | "down"; health: boolean };
let phase: Phase;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  phase = { version: OLD, status: { state: "idle", message: "" }, health: true };
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).split("?")[0];
    if (url === `${H}/update/check`) return json(check);
    if (url === `${H}/update/apply` && init?.method === "POST") {
      phase.status = { state: "working", message: "Rebuilding the app (this can take a few minutes)…" };
      return json({ accepted: true }, 202);
    }
    if (url === `${H}/update/status`) {
      if (phase.status === "down") throw new TypeError("Failed to fetch");
      return json(phase.status);
    }
    if (url === `${H}/update/version`) {
      if (phase.version === "down") throw new TypeError("Failed to fetch");
      return json({ current: phase.version });
    }
    if (url === "/api/health") return phase.health ? json({ status: "ok" }) : json({ detail: "starting" }, 502);
    return json({ detail: `unstubbed ${url}` }, 599);
  }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.mocked(reloadPage).mockClear(); });

async function startUpdate() {
  renderWithProviders(<UpdateSettings />);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  await user.click(await screen.findByRole("button", { name: "Update now" }));
}

it("waits through the helper restart, then reloads once the new version answers", async () => {
  await startUpdate();
  expect(await screen.findByText(/Rebuilding the app/)).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(4000);
  expect(reloadPage).not.toHaveBeenCalled();

  // The helper restarts: unreachable for a moment, and the app is still starting.
  phase = { version: "down", status: "down", health: false };
  await vi.advanceTimersByTimeAsync(4000);
  expect(reloadPage).not.toHaveBeenCalled();
  expect(screen.getByText(/Restarting the app/)).toBeInTheDocument();

  // New helper on the new commit, but the app is not answering yet.
  phase = { version: NEW, status: { state: "idle", message: "" }, health: false };
  await vi.advanceTimersByTimeAsync(4000);
  expect(reloadPage).not.toHaveBeenCalled();

  phase.health = true;
  await vi.advanceTimersByTimeAsync(4000);
  expect(reloadPage).toHaveBeenCalledTimes(1);
});

it("does not reload when the update fails, and says why", async () => {
  await startUpdate();
  phase.status = { state: "error", message: "The update could not be applied automatically because this copy has local changes. Nothing was changed." };
  await vi.advanceTimersByTimeAsync(4000);
  expect(await screen.findByText(/has local changes/)).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(10000);
  expect(reloadPage).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Update now" })).toBeEnabled();
});
