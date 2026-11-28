import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import { DeleteRun, derivedRuns } from "./DeleteRun";

// Owner request 28 November 2026: delete test runs to save space, without losing training data.
afterEach(() => vi.unstubAllGlobals());
const a = "a".repeat(32), b = "b".repeat(32), c = "c".repeat(32), d = "d".repeat(32);
const runs = [
  { id: a, state: "complete" },
  { id: b, state: "complete", parent_job_id: a, mode: "camera-tracking" },
  { id: c, state: "failed", parent_job_id: b, mode: "shirt-numbers" },
  { id: d, state: "complete" },
];

it("counts every run made from a run, however deep", () => {
  expect(derivedRuns(a, runs)).toEqual([b, c]);
  expect(derivedRuns(d, runs)).toEqual([]);
});

it("asks first, says what stays, then deletes and reports the space freed", async () => {
  const calls: { url: string; method?: string; token?: string }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/me")) return Response.json({ csrf_token: "synthetic" });
    calls.push({ url, method: init?.method, token: (init?.headers as Record<string, string>)?.["X-CSRF-Token"] });
    return Response.json({ deleted: [c, b, a], kept_labels: [a], freed_bytes: 2_200_000_000 });
  }));
  const done = vi.fn();
  renderWithProviders(<DeleteRun run={runs[0]} runs={runs} name="261122 U11 v Wolves" onDeleted={done} />);

  await userEvent.click(screen.getByRole("button", { name: "Delete this run" }));
  expect(calls).toEqual([]);
  const ask = screen.getByRole("alertdialog", { name: "Delete this run?" });
  expect(ask).toHaveTextContent("261122 U11 v Wolves and the 2 runs made from it");
  expect(ask).toHaveTextContent("Labels you saved on these runs are kept");
  expect(ask).toHaveTextContent("ball crops, label sets and trained models are not touched");
  expect(ask).toHaveTextContent("cannot be undone");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(calls).toEqual([]);

  await userEvent.click(screen.getByRole("button", { name: "Delete this run" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  await waitFor(() => expect(done).toHaveBeenCalledWith([c, b, a]));
  expect(calls).toEqual([{ url: `/_admin/api/video-analytics/jobs/${a}`, method: "DELETE", token: "synthetic" }]);
  expect(screen.getByRole("status")).toHaveTextContent("Deleted 3 runs and freed 2.2 GB. Saved labels kept for training.");
});

it("a run still being analysed cannot be deleted", () => {
  renderWithProviders(<DeleteRun run={{ id: a, state: "running" }} runs={runs} name="Wolves" onDeleted={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Delete this run" })).toBeDisabled();
});

it("shows why the worker refused, and keeps the run", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/me")) return Response.json({ csrf_token: "synthetic" });
    return Response.json({ detail: "Ball crops for Training are still being made from this run. Delete it after they are ready." }, { status: 409 });
  }));
  const done = vi.fn();
  renderWithProviders(<DeleteRun run={runs[3]} runs={runs} name="Wolves" onDeleted={done} />);
  await userEvent.click(screen.getByRole("button", { name: "Delete this run" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("Delete Wolves?");
  await userEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Ball crops for Training are still being made");
  expect(done).not.toHaveBeenCalled();
});
