import { screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

// Spec 660: one label teaches a kit; others in it are assigned; the match ball is drawn.
const JOB = "c".repeat(32), sha = "e".repeat(64);
const YELLOW = [105, 153, 173], RED = [80, 177, 160];
const rows = (track_id: number, colour_lab: number[], x: number) =>
  [0, 1 / 3, 2 / 3, 1].map(time_s => ({ track_id, time_s, team_id: null, role: "unknown", image_box: [x, 0.4, x + 0.03, 0.55], colour_lab }));
const detections = [0, 1 / 3, 2 / 3, 1].map(time_s => JSON.stringify({ time_s, detections: [{ kind: "ball", box: [940, 600, 970, 630], score: 0.8 }] })).join("\n");

function serve(withDense = false) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/samples")) return Response.json([]);
    const job = { id: JOB, match_title: "261107 RCW vs Kidderminster CG", state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 4, person_detections: 12, ball_detections: 4, unique_tracklets: 3, ball_observation_coverage: 1, football_events_confirmed: 0 }, artifacts: withDense ? ["sample.mp4", "team_assignments.json", "track_appearance.json", "dense_tracks.json", "summary.json"] : ["sample.mp4", "team_assignments.json", "track_appearance.json", "detections.jsonl", "summary.json"] };
    if (url.endsWith("/jobs")) return Response.json([job]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job);
    if (url.endsWith("/review")) return Response.json({ revision: 3, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false, track_labels: [{ track_id: 2, team: "own", role: "player" }, { track_id: 4, team: "opponent", role: "player" }], group_labels: [], rejected_suggestions: [] });
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: [...rows(2, YELLOW, 0.3), ...rows(3, YELLOW, 0.5), ...rows(4, RED, 0.6), ...rows(5, RED, 0.7)] });
    if (url.endsWith("track_appearance.json")) return Response.json({ groups: [], tracks: [], sprite: { file: "track_thumbs.jpg", cols: 50, w: 32, h: 64 } });
    if (url.endsWith("detections.jsonl")) return new Response(detections);
    if (url.endsWith("dense_tracks.json")) return Response.json({ windows: [{ start_s: 0, end_s: 1 }], observations: [...rows(2, YELLOW, 0.3), ...rows(3, YELLOW, 0.5), ...rows(4, RED, 0.6), ...rows(5, RED, 0.7), ...rows(9, RED, 0.8)].map(o => ({ ...o, linked: true })), balls: [0, 1 / 3, 2 / 3, 1].map(time_s => ({ time_s, image_box: [0.49, 0.55, 0.505, 0.58], score: 0.8 })) });
    throw new Error(`unstubbed ${url}`);
  }));
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("labelling one player per team assigns everyone else in those kits and draws the ball", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const people = await screen.findByRole("img", { name: "Ball" });
  expect(people).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Person 3: Our (kit)" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Person 5: Opp (kit)" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Person 2: Our" })).toBeInTheDocument();
  const learned = screen.getByLabelText("Kits learned");
  expect(within(learned).getAllByText("1 matched by kit")).toHaveLength(2);
});

it("a whole-clip refined run draws the ball from its dense balls; teams still come from the sampled rows", async () => {
  serve(true); renderWithProviders(<VideoLabPage />);
  expect(await screen.findByRole("img", { name: "Ball" })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "Person 3: Our (kit)" })).toBeInTheDocument();
  // Whole-clip dense people are linked to one sampled tracklet each across the whole clip, which
  // moved labels onto the wrong people on the real run (spec 660), so their people are not drawn.
  expect(screen.queryByRole("button", { name: /Person 9/ })).toBeNull();
});
