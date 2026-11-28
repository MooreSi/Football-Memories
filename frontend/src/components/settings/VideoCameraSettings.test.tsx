import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { AdvancedSettings } from "./AdvancedSettings";
vi.mock("../../api/hostedFlag", () => ({ HOSTED: true }));
afterEach(() => vi.unstubAllGlobals());

// App spec 850 (owner, 28 November 2026): "have a toggle of whether to use cpu or gpu for this analysis".
function serve(nodes: Record<string, unknown>, writes: RequestInit[] = []) {
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
const nodes = { mode: "remote", reid_backend: "pytorch", camera_compute: "cpu", local_ready: true, remote_ready: true,
  reid_backends: ["pytorch"], remote_reid_backends: ["pytorch"], camera_computes: ["cpu", "gpu"], remote_camera_computes: ["cpu", "gpu"] };

it("saves GPU for camera and pitch with fresh CSRF and the current Mac", async () => {
  const writes: RequestInit[] = [];
  serve(nodes, writes);
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "CPU" })).toBeChecked();
  await userEvent.click(screen.getByRole("radio", { name: "GPU (Metal)" }));
  await userEvent.click(screen.getByRole("button", { name: "Save camera and pitch" }));
  await waitFor(() => expect(screen.getByText("Camera and pitch saved for new jobs.")).toBeInTheDocument());
  expect(writes).toEqual([{ method: "PUT", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": "fresh-csrf" },
    body: JSON.stringify({ mode: "remote", camera_compute: "gpu" }) }]);
});

it("offers the GPU only where the job would run, and older gateways get CPU only", async () => {
  serve({ ...nodes, remote_camera_computes: ["cpu"] });
  const view = renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "GPU (Metal)" })).toBeDisabled();
  expect(screen.getByText(/GPU is not available on the MacBook Pro/)).toBeInTheDocument();
  view.unmount();
  serve({ mode: "local", local_ready: true, remote_ready: false });
  renderWithProviders(<AdvancedSettings />);
  expect(await screen.findByRole("radio", { name: "GPU (Metal)" })).toBeDisabled();
  expect(screen.getByRole("radio", { name: "CPU" })).toBeChecked();
});
