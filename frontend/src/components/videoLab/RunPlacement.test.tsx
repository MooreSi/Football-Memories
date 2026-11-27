import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

afterEach(() => vi.unstubAllGlobals());

it("a running analysis says which Macs and which compute it is using now", async () => {
  const job = { id: "a".repeat(32), state: "running", progress: 0.3, artifacts: [], execution: "split", reid_backend: "neural-engine" };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/me")) return Response.json({ csrf_token: "synthetic" });
    if (url.endsWith("/samples")) return Response.json([]);
    return Response.json(url.endsWith("/jobs") ? [job] : job);
  }));
  renderWithProviders(<VideoLabPage />);
  const line = await screen.findByLabelText("Where the analysis is running");
  expect(line).toHaveTextContent("Detecting and tracking players · Mac mini + MacBook Pro · Core ML: CPU, GPU and Neural Engine (macOS chooses)");
  expect(line).toHaveTextContent("split across both Macs");
});

it("a queued analysis does not claim a stage yet", async () => {
  const job = { id: "a".repeat(32), state: "queued", progress: 0, artifacts: [], execution: "split", reid_backend: "neural-engine" };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/me")) return Response.json({ csrf_token: "synthetic" });
    if (url.endsWith("/samples")) return Response.json([]);
    return Response.json(url.endsWith("/jobs") ? [job] : job);
  }));
  renderWithProviders(<VideoLabPage />);
  expect(await screen.findByText(/queued ·/i)).toBeInTheDocument();
  expect(screen.queryByLabelText("Where the analysis is running")).toBeNull();
});
