import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdvancedSettings } from "./AdvancedSettings";
vi.mock("../../api/hostedFlag", () => ({ HOSTED: true }));
afterEach(() => vi.unstubAllGlobals());

type Nodes = Record<string, unknown>;
function serve(nodes: Nodes, writes: RequestInit[] = []) {
  let state = { ...nodes };
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith("/me")) return Response.json({ role: "admin", stage: "full", csrf_token: "fresh-csrf" });
    if (String(url).endsWith("/video-nodes")) {
      if (init?.method === "PUT") { writes.push(init); state = { ...state, ...JSON.parse(String(init.body)) }; }
      return Response.json(state);
    }
    return Response.json([]);
  }));
}
const both = { mode: "local", reid_backend: "pytorch", local_ready: true, remote_ready: true,
  reid_backends: ["pytorch", "neural-engine"], remote_reid_backends: ["pytorch", "neural-engine"] };

it("saves the Neural Engine player-matching choice with fresh CSRF and the current location", async () => {
  const writes: RequestInit[] = [];
  serve({ ...both, mode: "split" }, writes);
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "Standard model" })).toBeChecked();
  const neural = screen.getByRole("radio", { name: "Neural Engine" });
  await userEvent.click(neural);
  await userEvent.click(screen.getByRole("button", { name: "Save player matching" }));
  await waitFor(() => expect(screen.getByText("Player matching saved for new jobs.")).toBeInTheDocument());
  expect(neural).toBeChecked();
  expect(writes).toEqual([{ method: "PUT", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": "fresh-csrf" },
    body: JSON.stringify({ mode: "split", reid_backend: "neural-engine" }) }]);
  expect(screen.getByText(/can group a few players differently/)).toBeInTheDocument();
});

it("offers the Neural Engine only where the current location has it installed", async () => {
  serve({ ...both, mode: "split", remote_reid_backends: ["pytorch"] });
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "Neural Engine" })).toBeDisabled();
  expect(screen.getByRole("radio", { name: "Standard model" })).toBeEnabled();
  expect(screen.getByText(/not installed on the MacBook Pro/)).toBeInTheDocument();
});

it("treats an older gateway without model fields as standard only", async () => {
  serve({ mode: "local", local_ready: true, remote_ready: false });
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "Standard model" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Neural Engine" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save player matching" })).toBeDisabled();
});
