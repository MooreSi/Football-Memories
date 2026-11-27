import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/render";
import VideoLabPage from "../../../pages/VideoLabPage";

/* Spec 790: Video Lab's Training tab. Ball crops from finished runs, labelled one at a time,
 * train the ball model; everything goes through the admin API with CSRF. */
const SET = "b".repeat(32), SHA = "c".repeat(64), RUN = "1".repeat(32), REQ = "f".repeat(32);
type Call = { url: string; init?: RequestInit };

function serve({ labels = {}, models = [], requests = [] as unknown[] }: { labels?: Record<string, { label: string }>; models?: unknown[]; requests?: unknown[] } = {}) {
  const calls: Call[] = [];
  let saved = { revision: 0, source_sha256: SHA, items: labels };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (url.endsWith("/jobs")) return Response.json([{ id: RUN, match_title: "RCW vs CG", state: "complete", progress: 1, created_at: "2026-11-27T10:00:00Z" }, { id: "2".repeat(32), state: "running", progress: 0.5 }]);
    if (url.endsWith(`/jobs/${RUN}`)) return Response.json({ id: RUN, state: "complete", progress: 1, artifacts: [] });
    if (url.endsWith("/ball-sets")) return Response.json([{ id: SET, match_title: "RCW vs CG", created_at: "2026-11-27T12:00:00Z", crops: 3, labelled: Object.keys(saved.items).length, revision: saved.revision }]);
    if (url.endsWith(`/ball-sets/${SET}`)) return Response.json({ id: SET, match_title: "RCW vs CG", source_sha256: SHA, labels: ["match_ball", "spare_ball", "cone", "person", "other"],
      items: [1, 2, 3].map(i => ({ index: i, time_s: 10 * i, box: [0.5, 0.5, 0.51, 0.52], score: 0.4, image: `crops/000${i}.jpg` })) });
    if (url.endsWith(`/ball-sets/${SET}/labels`) && init?.method === "PUT") {
      const body = JSON.parse(init.body as string) as typeof saved;
      saved = { ...body, revision: body.revision + 1 };
      return Response.json({ ...saved, label_origin: "human_reviewed" });
    }
    if (url.endsWith(`/ball-sets/${SET}/labels`)) return Response.json(saved);
    if (url.endsWith("/training/ball-sets")) return Response.json({ id: REQ, state: "queued", kind: "ball-set" }, { status: 202 });
    if (url.endsWith("/training/ball-model")) return Response.json({ id: REQ, state: "queued", kind: "ball-train" }, { status: 202 });
    if (url.endsWith("/training")) return Response.json({ requests, models });
    return Response.json({ detail: `unstubbed ${url}` }, { status: 599 });
  }));
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

it("Video Lab has Analysis and Training tabs, and the Training tab can be linked to", async () => {
  serve();
  renderWithProviders(<VideoLabPage />);
  const tabs = await screen.findByRole("tablist", { name: "Video Lab" });
  expect(within(tabs).getAllByRole("tab").map(t => t.textContent)).toEqual(["Analysis", "Training"]);
  expect(within(tabs).getByRole("tab", { name: "Analysis" })).toHaveAttribute("aria-selected", "true");
  await userEvent.click(within(tabs).getByRole("tab", { name: "Training" }));
  expect(await screen.findByRole("heading", { name: "Ball crops" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Analyse/ })).toBeNull();
});

it("asks for crops from a finished run and shows the request waiting", async () => {
  const calls = serve({ requests: [] });
  renderWithProviders(<VideoLabPage />, "/video-lab?tab=training");
  const add = await screen.findByRole("region", { name: "Add crops" });
  const pick = within(add).getByLabelText("Finished run");
  await waitFor(() => expect(within(pick).getAllByRole("option").map(o => o.textContent)).toEqual(["RCW vs CG"]));
  await userEvent.click(within(add).getByRole("button", { name: "Make crops" }));
  const post = await waitFor(() => { const c = calls.find(x => x.url.endsWith("/training/ball-sets")); if (!c) throw new Error("not posted"); return c; });
  expect(post.init?.method).toBe("POST");
  expect(JSON.parse(post.init?.body as string)).toEqual({ job_id: RUN });
  expect(post.init?.headers).toMatchObject({ "X-CSRF-Token": "synthetic-csrf" });
});

it("labels crops one at a time, saving each choice as a revision and moving on", async () => {
  const calls = serve();
  renderWithProviders(<VideoLabPage />, "/video-lab?tab=training");
  await userEvent.click(await screen.findByRole("button", { name: /RCW vs CG.*0 of 3 labelled/ }));
  const labeller = await screen.findByRole("region", { name: "Label ball crops" });
  expect(within(labeller).getByRole("img", { name: /Crop 1 of 3/ })).toHaveAttribute("src", expect.stringContaining(`/ball-sets/${SET}/crops/0001.jpg`));
  await userEvent.click(within(labeller).getByRole("button", { name: /^Match ball/ }));
  await waitFor(() => expect(within(labeller).getByRole("img", { name: /Crop 2 of 3/ })).toBeInTheDocument());
  const put = calls.filter(c => c.init?.method === "PUT").at(-1)!;
  expect(JSON.parse(put.init?.body as string)).toEqual({ revision: 0, source_sha256: SHA, items: { "1": { label: "match_ball" } } });
  expect(put.init?.headers).toMatchObject({ "X-CSRF-Token": "synthetic-csrf" });
  fireEvent.keyDown(window, { key: "3" });
  await waitFor(() => expect(within(labeller).getByRole("img", { name: /Crop 3 of 3/ })).toBeInTheDocument());
  fireEvent.keyDown(window, { key: "0" });
  await waitFor(() => expect(JSON.parse(calls.filter(c => c.init?.method === "PUT").at(-1)!.init?.body as string).items).toEqual({ "1": { label: "match_ball" }, "2": { label: "cone" }, "3": { label: "unsure" } }));
  expect(await within(labeller).findByText(/All 3 crops labelled/)).toBeInTheDocument();
});

it("trains only with enough labels on both sides, and shows a model's held-out numbers", async () => {
  const few = Object.fromEntries([1, 2, 3].map(i => [String(i), { label: "match_ball" }]));
  serve({ labels: few, models: [{ id: REQ, metrics: { counts: { match_ball: 40, cone: 35, person: 5 }, created_at: "2026-11-27T13:00:00Z",
    evaluation: { held_out_match: "NL vs Bournville", crops: 80, precision: 0.91, recall: 0.86, accuracy: 0.9, note: "One whole match held out; the model never saw it." } } }] });
  renderWithProviders(<VideoLabPage />, "/video-lab?tab=training");
  const model = await screen.findByRole("region", { name: "Ball model" });
  await waitFor(() => expect(within(model).getByText(/3 match balls and 0 other things labelled/)).toBeInTheDocument());
  expect(within(model).getByRole("button", { name: "Train ball model" })).toBeDisabled();
  expect(within(model).getByText(/at least 10 of each/)).toBeInTheDocument();
  const trained = within(model).getByRole("table", { name: "Trained ball models" });
  expect(within(trained).getByText("NL vs Bournville")).toBeInTheDocument();
  expect(within(trained).getByText("91%")).toBeInTheDocument();
  expect(within(trained).getByText("86%")).toBeInTheDocument();
});

it("queues training once there are enough labels and shows the worker's answer", async () => {
  const many = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [String(i + 1), { label: i < 12 ? "match_ball" : "cone" }]));
  const calls = serve({ labels: many, requests: [{ id: "e".repeat(32), kind: "ball-train", state: "failed", error: "Label at least 10 match balls and 10 other things first", created_at: "2026-11-27T12:30:00Z" }] });
  renderWithProviders(<VideoLabPage />, "/video-lab?tab=training");
  const model = await screen.findByRole("region", { name: "Ball model" });
  expect(await within(model).findByText(/Label at least 10 match balls/)).toBeInTheDocument();
  const train = within(model).getByRole("button", { name: "Train ball model" });
  await waitFor(() => expect(train).toBeEnabled());
  await userEvent.click(train);
  await waitFor(() => expect(calls.some(c => c.url.endsWith("/training/ball-model") && c.init?.method === "POST")).toBe(true));
});

it("counts read naturally for one of each", async () => {
  serve({ labels: { "1": { label: "match_ball" }, "2": { label: "cone" } } });
  renderWithProviders(<VideoLabPage />, "/video-lab?tab=training");
  const model = await screen.findByRole("region", { name: "Ball model" });
  expect(await within(model).findByText(/1 match ball and 1 other thing labelled/)).toBeInTheDocument();
});
