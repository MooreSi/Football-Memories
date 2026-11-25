import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import LabelFramesPage from "./LabelFramesPage";

// Spec 670: confirm or correct the detector's boxes; only confirmed frames train it.
const ID = "b".repeat(32), SHA = "c".repeat(64);
const set = {
  id: ID, match_title: "RCW vs CG", source_sha256: SHA, width: 1920, height: 1080,
  presort: { "1": { ball: "visible", note: "by the corner flag" } },
  frames: [
    { index: 1, time_s: 12, image: "frames/0001.jpg", reasons: ["players overlap"], proposals: [{ kind: "person", box: [0.1, 0.2, 0.12, 0.3], score: 0.9 }, { kind: "ball", box: [0.4, 0.4, 0.405, 0.41], score: 0.8 }] },
    { index: 2, time_s: 75, image: "frames/0002.jpg", reasons: ["random"], proposals: [] },
  ],
};

function serve(put: (body: unknown) => Response) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url === "/_portal/api/me") return Response.json({ csrf_token: "t" });
    if (url.endsWith("/label-sets")) return Response.json([{ id: ID, match_title: "RCW vs CG", frames: 2, confirmed: 0, revision: 0 }]);
    if (url.endsWith(`/label-sets/${ID}`)) return Response.json(set);
    if (url.endsWith(`/label-sets/${ID}/labels`)) return init?.method === "PUT" ? put(JSON.parse(String(init.body))) : Response.json({ revision: 0, source_sha256: SHA, frames: {} });
    throw new Error(`unstubbed ${url}`);
  }));
  return calls;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("confirming a frame saves the boxes you kept, as human labels, and moves to the next frame", async () => {
  const calls = serve(body => Response.json({ ...(body as object), revision: 1, label_origin: "human_reviewed" }));
  renderWithProviders(<LabelFramesPage />);
  fireEvent.click(await screen.findByRole("button", { name: /RCW vs CG.*0 of 2 confirmed/ }));
  expect(await screen.findByRole("img", { name: "Frame 1 of 2 at 0:12" })).toBeInTheDocument();
  expect(screen.getByText("Players overlap")).toBeInTheDocument();
  expect(screen.getByText(/Assistant pre-sort: ball visible, by the corner flag/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove person box 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm frame" }));
  await screen.findByRole("img", { name: "Frame 2 of 2 at 1:15" });
  const put = calls.find(c => c.init?.method === "PUT")!;
  expect((put.init!.headers as Record<string, string>)["X-CSRF-Token"]).toBe("t");
  expect(JSON.parse(String(put.init!.body))).toEqual({ revision: 0, source_sha256: SHA, frames: { 1: { status: "confirmed", boxes: [{ kind: "ball", box: [0.4, 0.4, 0.405, 0.41] }] } } });
});

it("skipping saves the frame as skipped, and a stale window is told to reload", async () => {
  serve(() => new Response("{}", { status: 409 }));
  renderWithProviders(<LabelFramesPage />);
  fireEvent.click(await screen.findByRole("button", { name: /RCW vs CG/ }));
  await screen.findByRole("img", { name: "Frame 1 of 2 at 0:12" });
  fireEvent.click(screen.getByRole("button", { name: "Skip frame" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Labels changed in another window"));
  expect(screen.getByRole("img", { name: "Frame 1 of 2 at 0:12" })).toBeInTheDocument();
});
