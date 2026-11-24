import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

const JOB = "a".repeat(32);
const sha = "f".repeat(64);
let posts: { url: string; body: unknown }[] = [];
const BASE_FILES = ["sample.mp4", "veo_tags.json", "team_assignments.json", "track_appearance.json", "summary.json"];
const box = (x: number, y: number, h = 0.1) => [x - 0.01, y - h, x + 0.01, y];
const row = (track_id: number, x: number, y: number, h?: number) => ({ track_id, time_s: 0, team_id: null, role: "unknown", image_box: box(x, y, h) });
// Three labelled players across the pitch and a spectator far beyond them, near the top of the frame.
const OBSERVATIONS = [row(2, 0.3, 0.6), row(3, 0.6, 0.8), row(4, 0.5, 0.5), row(5, 0.5, 0.15, 0.04)];
const LABELS = [{ track_id: 2, team: "own", role: "player" }, { track_id: 3, team: "own", role: "player" }, { track_id: 4, team: "opponent", role: "player" }];

function serve(artifacts: string[], labels: unknown[] = []) {
  posts = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (init?.method === "POST") { posts.push({ url, body: JSON.parse(init.body as string) }); return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 }); }
    const job = { id: JOB, state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 1, person_detections: 4, ball_detections: 0, unique_tracklets: 4, ball_observation_coverage: 0, football_events_confirmed: 0 }, artifacts };
    if (url.endsWith("/jobs")) return Response.json([job]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job);
    if (url.endsWith(`/jobs/${"b".repeat(32)}`)) return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 });
    if (url.endsWith("/review")) return Response.json({ revision: 1, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: labels, group_labels: [], rejected_suggestions: [] });
    if (url.endsWith("veo_tags.json")) return Response.json({ events: [{ id: "veo-team-1", type: "corner", side: "own", time_s: 2 }], highlights: [] });
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: OBSERVATIONS });
    if (url.endsWith("track_appearance.json")) return Response.json({ groups: [{ id: 0, size: 4, colour_hex: null, examples: [2] }], tracks: [2, 3, 4, 5].map((t, i) => ({ track_id: t, group: 0, start_s: 0, end_s: 9, thumb: i, v: [i, 1], kit: null })), sprite: { file: "track_thumbs.jpg", cols: 50, w: 32, h: 64 } });
    if (url.endsWith("dense_tracks.json")) return Response.json({ windows: [{ start_s: 0, end_s: 6 }], observations: [{ track_id: 50, time_s: 0, image_box: box(0.4, 0.7), linked: false }] });
    throw new Error(`unstubbed ${url}`);
  }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("a run with moments offers to refine them and opens the new run", async () => {
  serve(BASE_FILES); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await screen.findByRole("button", { name: "Refine moments" }));
  expect(posts[0]).toEqual({ url: `/_admin/api/video-analytics/jobs/${JOB}/refine-moments`, body: { source_sha256: sha } });
  expect(await screen.findByText(/queued · 0%/i)).toBeInTheDocument();
});

it("a refined run draws people from the refined positions inside moment clips", async () => {
  serve([...BASE_FILES, "dense_tracks.json"]); renderWithProviders(<VideoLabPage />);
  expect(await screen.findByRole("button", { name: /^Person 50:/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Person 2:/ })).toBeNull();
  expect(screen.queryByRole("button", { name: "Refine moments" })).toBeNull();
});

it("leaves out a spectator far from the labelled players until you choose to show everyone", async () => {
  serve(BASE_FILES, LABELS); renderWithProviders(<VideoLabPage />);
  expect(await screen.findByRole("button", { name: /^Person 4:/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^Person 5:/ })).toBeNull();
  await userEvent.click(screen.getByRole("checkbox", { name: "Show everyone" }));
  await waitFor(() => expect(screen.getByRole("button", { name: /^Person 5:/ })).toBeInTheDocument());
});
