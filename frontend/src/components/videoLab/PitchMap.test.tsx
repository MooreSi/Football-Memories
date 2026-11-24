import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

const JOB = "a".repeat(32);
const sha = "f".repeat(64);
let puts: Record<string, unknown>[] = [];
const FILES = ["sample.mp4", "team_assignments.json", "camera_motion.json", "summary.json"];
// The whole frame is marked as the pitch, so image x maps straight onto the length and y onto the width.
const WHOLE = [{ time_s: 0, corners: [[0, 1], [1, 1], [1, 0], [0, 0]] }];
const STILL = { times: [0, 5, 10], steps: [[1, 0, 0, 0, 1, 0, 0, 0, 1], [1, 0, 0, 0, 1, 0, 0, 0, 1]], cuts: [false, false] };
// Person 2 runs a fifth of the pitch length along the halfway line in four seconds.
const RUN = [0, 1, 2, 3, 4].map(i => ({ track_id: 2, time_s: i, team_id: null, role: "unknown", image_box: [0.39 + 0.05 * i, 0.4, 0.41 + 0.05 * i, 0.5] }));

function serve(size: unknown = null) {
  puts = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (init?.method === "PUT") { const body = JSON.parse(init.body as string) as Record<string, unknown>; puts.push(body); return Response.json({ ...body, revision: (body.revision as number) + 1 }); }
    const job = { id: JOB, state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 5, person_detections: 5, ball_detections: 0, unique_tracklets: 1, ball_observation_coverage: 0, football_events_confirmed: 0 }, artifacts: FILES };
    if (url.endsWith("/jobs")) return Response.json([job]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job);
    if (url.endsWith("/review")) return Response.json({ revision: 1, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [{ track_id: 2, team: "own", role: "player" }], group_labels: [], rejected_suggestions: [], pitch_keyframes: WHOLE, pitch_size: size });
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: RUN });
    if (url.endsWith("camera_motion.json")) return Response.json(STILL);
    throw new Error(`unstubbed ${url}`);
  }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("asks for the pitch size and saves your choice", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const map = await screen.findByRole("region", { name: "Pitch map" });
  await userEvent.selectOptions(within(map).getByLabelText("Pitch size"), "7v7 (55 x 37 m)");
  await waitFor(() => expect(puts.at(-1)?.pitch_size).toEqual({ length_m: 55, width_m: 37 }), { timeout: 3000 });
});

it("shows where your labelled player is on the pitch in metres", async () => {
  serve({ length_m: 100, width_m: 60 }); renderWithProviders(<VideoLabPage />);
  const map = await screen.findByRole("region", { name: "Pitch map" });
  // At 0 s the player's feet are at image (0.4, 0.5): 40 m along, 30 m in.
  expect(await within(map).findByLabelText("Our team player at 40 m along, 30 m in")).toBeInTheDocument();
});

it("gives the selected person's distance covered and top speed", async () => {
  serve({ length_m: 100, width_m: 60 }); renderWithProviders(<VideoLabPage />);
  fireEvent.click(await screen.findByRole("button", { name: /^Person 2:/ }));
  const map = screen.getByRole("region", { name: "Pitch map" });
  expect(await within(map).findByText(/20 m covered/)).toBeInTheDocument();
  expect(within(map).getByText(/top speed 5\.0 m\/s/)).toBeInTheDocument();
});

it("switches to a heat map of where your team played", async () => {
  serve({ length_m: 100, width_m: 60 }); renderWithProviders(<VideoLabPage />);
  const map = await screen.findByRole("region", { name: "Pitch map" });
  await userEvent.click(within(map).getByRole("button", { name: "Our team heat map" }));
  expect(within(map).getAllByLabelText(/^Our team spent/).length).toBeGreaterThan(0);
});
