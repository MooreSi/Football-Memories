import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdvancedSettings } from "./AdvancedSettings";
vi.mock("../../api/hostedFlag", () => ({ HOSTED: true }));
afterEach(() => vi.unstubAllGlobals());

type Nodes = Record<string, unknown>;
function serve(nodes: Nodes, writes: RequestInit[] = [], reject = false) {
  let state = { ...nodes };
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith("/me")) return Response.json({ role: "admin", stage: "full", csrf_token: "fresh-csrf" });
    if (String(url).endsWith("/video-nodes")) {
      if (init?.method === "PUT") {
        writes.push(init);
        if (reject) return Response.json({ detail: "x" }, { status: 409 });
        state = { ...state, ...JSON.parse(String(init.body)) };
      }
      return Response.json(state);
    }
    return Response.json([]);
  }));
}
const all = ["pytorch", "neural-engine", "core-ai"];
const nodes = { mode: "local", reid_backend: "pytorch", local_ready: true, remote_ready: true,
  reid_backends: all, remote_reid_backends: all };

it("saves the Core AI player-matching choice with fresh CSRF and the current location", async () => {
  const writes: RequestInit[] = [];
  serve({ ...nodes, mode: "split" }, writes);
  renderWithProviders(<AdvancedSettings />);
  const coreAi = await screen.findByRole("radio", { name: "Core AI" });
  expect(coreAi).toBeEnabled();
  await userEvent.click(coreAi);
  await userEvent.click(screen.getByRole("button", { name: "Save player matching" }));
  await waitFor(() => expect(screen.getByText("Player matching saved for new jobs.")).toBeInTheDocument());
  expect(coreAi).toBeChecked();
  expect(writes).toEqual([{ method: "PUT", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": "fresh-csrf" },
    body: JSON.stringify({ mode: "split", reid_backend: "core-ai" }) }]);
  expect(screen.getByText(/groups players almost exactly like the standard model/)).toBeInTheDocument();
});

it("shows a saved Core AI choice as selected", async () => {
  serve({ ...nodes, reid_backend: "core-ai" });
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "Core AI" })).toBeChecked();
  expect(screen.getByRole("radio", { name: "Standard model" })).not.toBeChecked();
});

it("offers Core AI only where the current location has it installed", async () => {
  serve({ ...nodes, mode: "remote", remote_reid_backends: ["pytorch", "neural-engine"] });
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "Core AI" })).toBeDisabled();
  expect(screen.getByRole("radio", { name: "Neural Engine" })).toBeEnabled();
  expect(screen.getByText("The Core AI model is not installed on the MacBook Pro. Choose Local, or use another model.")).toBeInTheDocument();
});

it("says Core AI is missing on this Mac when the worker does not list it", async () => {
  serve({ ...nodes, reid_backends: ["pytorch", "neural-engine"] });
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "Core AI" })).toBeDisabled();
  expect(screen.getByText("The Core AI model is not installed on this Mac.")).toBeInTheDocument();
});

it("names Core AI when the gateway refuses it", async () => {
  serve(nodes, [], true);
  renderWithProviders(<AdvancedSettings />);
  await userEvent.click(await screen.findByRole("radio", { name: "Core AI" }));
  await userEvent.click(screen.getByRole("button", { name: "Save player matching" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("The Core AI model is not installed where these jobs run.");
});
