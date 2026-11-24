import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

const JOB = "a".repeat(32);
const sha = "f".repeat(64);
let posts: { url: string; body: unknown }[] = [];
let puts: Record<string, unknown>[] = [];
const FILES = ["sample.mp4", "team_assignments.json", "summary.json"];
const box = (x: number, y: number) => [x - 0.01, y - 0.1, x + 0.01, y];
// One player on the left half (the marked pitch) and one on a neighbouring pitch to the right.
const OBSERVATIONS = [{ track_id: 2, time_s: 0, team_id: null, role: "unknown", image_box: box(0.25, 0.7) }, { track_id: 7, time_s: 0, team_id: null, role: "unknown", image_box: box(0.8, 0.7) }];
const LEFT_HALF = [{ time_s: 0, corners: [[0, 1], [0.5, 1], [0.5, 0.2], [0, 0.2]] }];
const STILL = { times: [0, 1, 2], steps: [[1, 0, 0, 0, 1, 0, 0, 0, 1], [1, 0, 0, 0, 1, 0, 0, 0, 1]], cuts: [false, false] };

function serve(artifacts: string[], marks: unknown[] = []) {
  posts = []; puts = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (init?.method === "POST") { posts.push({ url, body: JSON.parse(init.body as string) }); return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 }); }
    if (init?.method === "PUT") { const body = JSON.parse(init.body as string) as Record<string, unknown>; puts.push(body); return Response.json({ ...body, revision: (body.revision as number) + 1 }); }
    const job = { id: JOB, state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 1, person_detections: 2, ball_detections: 0, unique_tracklets: 2, ball_observation_coverage: 0, football_events_confirmed: 0 }, artifacts };
    if (url.endsWith("/jobs")) return Response.json([job]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job);
    if (url.endsWith(`/jobs/${"b".repeat(32)}`)) return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 });
    if (url.endsWith("/review")) return Response.json({ revision: 1, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [], group_labels: [], rejected_suggestions: [], pitch_keyframes: marks });
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: OBSERVATIONS });
    if (url.endsWith("camera_motion.json")) return Response.json(STILL);
    throw new Error(`unstubbed ${url}`);
  }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("a run without camera tracking offers to prepare the pitch outline", async () => {
  serve(FILES); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await screen.findByRole("button", { name: "Prepare pitch outline" }));
  expect(posts[0]).toEqual({ url: `/_admin/api/video-analytics/jobs/${JOB}/track-camera`, body: { source_sha256: sha } });
});

it("with a marked pitch only people on it get a ring, until you show everyone", async () => {
  serve([...FILES, "camera_motion.json"], LEFT_HALF); renderWithProviders(<VideoLabPage />);
  expect(await screen.findByRole("button", { name: /^Person 2:/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Person 7:/ })).toBeNull();
  await userEvent.click(screen.getByRole("checkbox", { name: "Show everyone" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /^Person 7:/ })).toBeInTheDocument());
});

it("marking the pitch saves four corners at the paused moment", async () => {
  serve([...FILES, "camera_motion.json"]); renderWithProviders(<VideoLabPage />);
  const panel = await screen.findByRole("region", { name: "Pitch outline" });
  await userEvent.click(within(panel).getByRole("button", { name: "Mark pitch here" }));
  expect(screen.getAllByRole("slider", { name: /corner/i })).toHaveLength(4);
  await userEvent.click(within(panel).getByRole("button", { name: "Save pitch mark" }));
  await waitFor(() => expect(puts.at(-1)?.pitch_keyframes).toEqual([{ time_s: 0, corners: expect.any(Array) }]), { timeout: 3000 });
  expect((puts.at(-1)!.pitch_keyframes as { corners: unknown[] }[])[0].corners).toHaveLength(4);
});

it("a pitch mark can be deleted", async () => {
  serve([...FILES, "camera_motion.json"], LEFT_HALF); renderWithProviders(<VideoLabPage />);
  const panel = await screen.findByRole("region", { name: "Pitch outline" });
  await userEvent.click(await within(panel).findByRole("button", { name: /Delete mark at 0:00/ }));
  await waitFor(() => expect(puts.at(-1)?.pitch_keyframes).toEqual([]), { timeout: 3000 });
});
