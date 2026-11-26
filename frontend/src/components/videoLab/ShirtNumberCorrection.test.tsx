import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

const JOB = "a".repeat(32);
const sha = "f".repeat(64);
let puts: Record<string, unknown>[] = [];
let posts: { url: string; body: unknown }[] = [];
// The whole frame is marked as the pitch: image x maps onto the length and y onto the width.
const WHOLE = [{ time_s: 0, corners: [[0, 1], [1, 1], [1, 0], [0, 0]] }];
const STILL = { times: [0, 5, 10], steps: [[1, 0, 0, 0, 1, 0, 0, 0, 1], [1, 0, 0, 0, 1, 0, 0, 0, 1]], cuts: [false, false] };
const RUN = [0, 1, 2, 3, 4].map(i => ({ track_id: 2, time_s: i, team_id: null, role: "unknown", image_box: [0.39, 0.4, 0.41, 0.5] }));

function serve({ read = true, numbers = [] as unknown[] } = {}) {
  puts = []; posts = [];
  const artifacts = ["sample.mp4", "team_assignments.json", "camera_motion.json", "detections.jsonl", "summary.json", ...(read ? ["jersey_candidates.json"] : [])];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (init?.method === "PUT") { const body = JSON.parse(init.body as string) as Record<string, unknown>; puts.push(body); return Response.json({ ...body, revision: (body.revision as number) + 1 }); }
    if (init?.method === "POST") { posts.push({ url, body: JSON.parse(init.body as string) }); return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 }); }
    const job = { id: JOB, state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 5, person_detections: 5, ball_detections: 0, unique_tracklets: 1, ball_observation_coverage: 0, football_events_confirmed: 0 }, artifacts };
    if (url.endsWith("/jobs")) return Response.json([job]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job);
    if (url.endsWith(`/jobs/${"b".repeat(32)}`)) return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 });
    if (url.endsWith("/review")) return Response.json({ revision: 1, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [{ track_id: 2, team: "own", role: "player" }], group_labels: [], rejected_suggestions: [], pitch_keyframes: WHOLE, pitch_size: { length_m: 100, width_m: 60 }, shirt_numbers: numbers });
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: RUN });
    if (url.endsWith("camera_motion.json")) return Response.json(STILL);
    if (url.endsWith("detections.jsonl")) return new Response("");
    if (url.endsWith("jersey_candidates.json")) return Response.json([{ track_id: 2, number: 14, votes: 6, confidence: 0.8, confirmed: false }]);
    throw new Error(`unstubbed ${url}`);
  }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const map = () => screen.findByRole("region", { name: "Pitch map" });

it("shows the automatically read shirt number on the player's dot", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const dot = await within(await map()).findByRole("button", { name: "Our team player number 14 (read automatically) at 40 m along, 30 m in" });
  expect(dot).toHaveTextContent("14");
});

it("lets you correct a shirt number, and your number replaces the reading", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await within(await map()).findByRole("button", { name: /^Our team player number 14/ }));
  const person = screen.getByRole("region", { name: "Selected person" });
  expect(person).toHaveTextContent("Shirt number: 14 · read automatically");
  const box = within(person).getByLabelText("Shirt number");
  await userEvent.clear(box); await userEvent.type(box, "7");
  await userEvent.click(within(person).getByRole("button", { name: "Save number" }));
  await waitFor(() => expect(puts.at(-1)?.shirt_numbers).toEqual([{ track_id: 2, number: 7 }]), { timeout: 3000 });
  expect(await within(await map()).findByRole("button", { name: "Our team player number 7 at 40 m along, 30 m in" })).toHaveTextContent("7");
});

it("marks a wrong reading as no number", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await within(await map()).findByRole("button", { name: /^Our team player number 14/ }));
  await userEvent.click(within(screen.getByRole("region", { name: "Selected person" })).getByRole("button", { name: "No number" }));
  await waitFor(() => expect(puts.at(-1)?.shirt_numbers).toEqual([{ track_id: 2, number: null }]), { timeout: 3000 });
  expect(await within(await map()).findByRole("button", { name: "Our team player at 40 m along, 30 m in" })).toBeInTheDocument();
});

it("goes back to the automatic reading when you remove your number", async () => {
  serve({ numbers: [{ track_id: 2, number: 7 }] }); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await within(await map()).findByRole("button", { name: /^Our team player number 7 at/ }));
  await userEvent.click(within(screen.getByRole("region", { name: "Selected person" })).getByRole("button", { name: "Use the automatic reading" }));
  await waitFor(() => expect(puts.at(-1)?.shirt_numbers).toEqual([]), { timeout: 3000 });
  expect(await within(await map()).findByRole("button", { name: /^Our team player number 14 \(read automatically\)/ })).toBeInTheDocument();
});

it("starts a run that reads shirt numbers on this match", async () => {
  serve({ read: false }); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await screen.findByRole("button", { name: "Read shirt numbers" }));
  await waitFor(() => expect(posts[0]).toEqual({ url: `/_admin/api/video-analytics/jobs/${JOB}/read-shirt-numbers`, body: { source_sha256: sha } }));
});
