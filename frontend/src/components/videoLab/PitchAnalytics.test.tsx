import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

/* The Video Lab page reads pitch analytics tags off the live 2D pitch: our labelled player runs along
 * the halfway line with the ball at his feet, so the pitch gives our team the ball. */
const JOB = "b".repeat(32);
const sha = "e".repeat(64);
const FILES = ["sample.mp4", "team_assignments.json", "camera_motion.json", "summary.json", "detections.jsonl"];
const WHOLE = [{ time_s: 0, corners: [[0, 1], [1, 1], [1, 0], [0, 0]] }];
const STILL = { times: [0, 5, 10], steps: [[1, 0, 0, 0, 1, 0, 0, 0, 1], [1, 0, 0, 0, 1, 0, 0, 0, 1]], cuts: [false, false] };
const TIMES = Array.from({ length: 13 }, (_, i) => i / 3);
const RUN = TIMES.map(t => ({ track_id: 2, time_s: t, team_id: null, role: "unknown", image_box: [0.39 + 0.05 * t, 0.4, 0.41 + 0.05 * t, 0.5] }));
// A 10 px ball whose ground contact is the player's feet.
const BALLS = TIMES.map(t => JSON.stringify({ time_s: t, detections: [{ kind: "ball", box: [768 + 96 * t - 5, 530, 768 + 96 * t + 5, 540], score: 0.9 }] })).join("\n");

function serve(withBall: boolean) {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (init?.method === "PUT") { const body = JSON.parse(init.body as string) as Record<string, unknown>; return Response.json({ ...body, revision: (body.revision as number) + 1 }); }
    const job = { id: JOB, state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 13, person_detections: 13, ball_detections: 13, unique_tracklets: 1, ball_observation_coverage: 1, football_events_confirmed: 0 }, artifacts: withBall ? FILES : FILES.slice(0, -1) };
    if (url.endsWith("/jobs")) return Response.json([job]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job);
    if (url.endsWith("/review")) return Response.json({ revision: 1, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [{ track_id: 2, team: "own", role: "player" }], group_labels: [], rejected_suggestions: [], pitch_keyframes: WHOLE, pitch_size: { length_m: 100, width_m: 60 } });
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: RUN });
    if (url.endsWith("camera_motion.json")) return Response.json(STILL);
    if (url.endsWith("detections.jsonl")) return new Response(BALLS);
    throw new Error(`unstubbed ${url}`);
  }));
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("summarises pitch analytics under the map and lists them as their own source of moments", async () => {
  serve(true); renderWithProviders(<VideoLabPage />);
  const map = await screen.findByRole("region", { name: "Pitch map" });
  const table = await within(map).findByRole("table", { name: "Pitch analytics by team" });
  expect(within(within(table).getByRole("row", { name: /^Possession %/ })).getAllByRole("cell").map(c => c.textContent)).toEqual(["100", "0"]);
  const rail = screen.getByRole("complementary", { name: "Match moments" });
  expect(within(rail).getByRole("button", { name: /^Pitch analytics/ })).not.toHaveTextContent(/^Pitch analytics0$/);
  expect(within(rail).getAllByText("Analytics").length).toBeGreaterThan(0);
});

it("without a ball the pitch gives no analytics tags and says why", async () => {
  serve(false); renderWithProviders(<VideoLabPage />);
  const map = await screen.findByRole("region", { name: "Pitch map" });
  expect(await within(map).findByText(/no pitch analytics tags yet/i)).toBeInTheDocument();
});
