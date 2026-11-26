import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/render";
import VideoLabPage from "../../pages/VideoLabPage";

const JOB = "a".repeat(32);
const sha = "f".repeat(64);
let puts: { url: string; body: Record<string, unknown>; token: string }[] = [];
let posts: { url: string; body: unknown }[] = [];
let putStatus = 200;

function job(artifacts: string[]) {
  return { id: JOB, state: "complete", progress: 1, summary: { source_sha256: sha, sampled_frames: 3, person_detections: 3, ball_detections: 0, unique_tracklets: 3, ball_observation_coverage: 0, football_events_confirmed: 0 }, artifacts };
}
const FULL = ["annotated.mp4", "veo_tags.json", "event_suggestions.json", "team_assignments.json", "track_appearance.json", "summary.json"];

function serve(artifacts = FULL) {
  puts = []; posts = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/_portal/api/me")) return Response.json({ csrf_token: "synthetic-csrf" });
    if (url.endsWith("/samples")) return Response.json([]);
    if (init?.method === "PUT") {
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      puts.push({ url, body, token: (init.headers as Record<string, string>)["X-CSRF-Token"] });
      return putStatus === 200 ? Response.json({ ...body, revision: (body.revision as number) + 1 }) : new Response("", { status: putStatus });
    }
    if (init?.method === "POST") { posts.push({ url, body: JSON.parse(init.body as string) }); return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 }); }
    if (url.endsWith("/jobs")) return Response.json([job(artifacts)]);
    if (url.endsWith(`/jobs/${JOB}`)) return Response.json(job(artifacts));
    if (url.endsWith(`/jobs/${"b".repeat(32)}`)) return Response.json({ id: "b".repeat(32), state: "queued", progress: 0 });
    if (url.endsWith("/review")) return Response.json({ revision: 0, source_sha256: sha, events: [], identities: [], reviewed_intervals: [], review_complete: false });
    if (url.endsWith("veo_tags.json")) return Response.json({ events: [{ id: "veo-team-1", type: "corner", side: "own", time_s: 10 }], highlights: [] });
    if (url.endsWith("event_suggestions.json")) return Response.json([{ id: "tdeed-pass-1", type: "pass", time_s: 20, score: 0.7, actor_candidates: [{ track_id: 2, evidence: "ball_nearest", distance: 0.2 }] }, { id: "tdeed-drive-2", type: "drive", time_s: 30, score: 0.6, actor_candidates: [] }]);
    if (url.endsWith("team_assignments.json")) return Response.json({ image_width: 1920, image_height: 1080, observations: [{ track_id: 2, time_s: 0, team_id: null, role: "unknown", image_box: [0.1, 0.1, 0.2, 0.4] }] });
    if (url.endsWith("track_appearance.json")) return Response.json({ groups: [{ id: 0, size: 2, colour_hex: "#ff0000", examples: [2, 3] }], tracks: [{ track_id: 2, group: 0, start_s: 0, end_s: 40, thumb: 0, v: [1, 0], kit: [150, 170, 150] }, { track_id: 3, group: 0, start_s: 0, end_s: 40, thumb: 1, v: [1, 0], kit: [150, 170, 150] }], sprite: { file: "track_thumbs.jpg", cols: 50, w: 32, h: 64 } });
    throw new Error(`unstubbed ${url}`);
  }));
}

const played = vi.fn();
beforeEach(() => {
  putStatus = 200; played.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) { played(this.currentTime); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("clicking a moment plays its clip from a few seconds before, and Next moves on", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const rail = await screen.findByRole("complementary", { name: "Match moments" });
  await userEvent.click(await within(rail).findByRole("button", { name: /corner/i }));
  expect(played).toHaveBeenLastCalledWith(7);
  await userEvent.click(screen.getByRole("button", { name: "Next moment" }));
  expect(played).toHaveBeenLastCalledWith(17);
  expect(screen.getByText("2 of 3")).toBeInTheDocument();
});

it("filters moments by team, including model suggestions with an estimated team", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const rail = await screen.findByRole("complementary", { name: "Match moments" });
  await userEvent.click(within(rail).getByRole("button", { name: /^No team yet/ }));
  await waitFor(() => expect(within(rail).getAllByRole("listitem")).toHaveLength(2));
  expect(within(rail).queryByRole("button", { name: /corner/i })).toBeNull();
});

it("clicking a person on the video and choosing a team saves your label with CSRF", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  fireEvent.click(await screen.findByRole("button", { name: /^Person 2:/ }));
  await userEvent.click(screen.getByRole("button", { name: "Opponent player" }));
  await waitFor(() => expect(puts).toHaveLength(1), { timeout: 3000 });
  expect(puts[0].token).toBe("synthetic-csrf");
  expect(puts[0].body.track_labels).toEqual([{ track_id: 2, team: "opponent", role: "player" }]);
  expect(await screen.findByText("All changes saved")).toBeInTheDocument();
});

it("a labelled player makes the nearest-the-ball action an estimated team, which you approve", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  fireEvent.click(await screen.findByRole("button", { name: /^Person 2:/ }));
  await userEvent.click(screen.getByRole("button", { name: "Opponent player" }));
  const rail = screen.getByRole("complementary", { name: "Match moments" });
  const pass = await within(rail).findByRole("button", { name: /pass/i });
  expect(pass).toHaveTextContent("Opponent (estimated)");
  await userEvent.click(pass);
  await userEvent.click(screen.getByRole("button", { name: /Approve · Opponent/ }));
  await waitFor(() => expect(puts.at(-1)?.body.events).toEqual([{ id: "tdeed-pass-1", type: "pass", time_s: 20, track_id: null, confirmed: true, team: "opponent" }]), { timeout: 3000 });
});

it("rejecting a suggestion records it and hides it from the list", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const rail = await screen.findByRole("complementary", { name: "Match moments" });
  await userEvent.click(await within(rail).findByRole("button", { name: /drive/i }));
  await userEvent.click(screen.getByRole("button", { name: /^Reject/ }));
  expect(within(rail).queryByRole("button", { name: /drive/i })).toBeNull();
  await waitFor(() => expect(puts.at(-1)?.body.rejected_suggestions).toEqual(["tdeed-drive-2"]), { timeout: 3000 });
});

it("marks a look-alike group as not players", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const setup = await screen.findByRole("region", { name: "Team setup" });
  await userEvent.click(await within(setup).findByRole("button", { name: "Not players" }));
  await waitFor(() => expect(puts.at(-1)?.body.group_labels).toEqual([{ group_id: 0, team: null, role: "other" }]), { timeout: 3000 });
});

it("a save conflict tells you to reload instead of overwriting", async () => {
  serve(); putStatus = 409; renderWithProviders(<VideoLabPage />);
  fireEvent.click(await screen.findByRole("button", { name: /^Person 2:/ }));
  await userEvent.click(screen.getByRole("button", { name: "Our player" }));
  expect(await screen.findByText(/changed in another window/, {}, { timeout: 3000 })).toBeInTheDocument();
});

it("an older run offers to prepare player grouping and opens the new run", async () => {
  serve(["annotated.mp4", "event_suggestions.json", "summary.json"]); renderWithProviders(<VideoLabPage />);
  await userEvent.click(await screen.findByRole("button", { name: "Prepare player grouping" }));
  expect(posts[0]).toEqual({ url: `/_admin/api/video-analytics/jobs/${JOB}/prepare-review`, body: { source_sha256: sha } });
  expect(await screen.findByText(/queued · 0%/i)).toBeInTheDocument();
});

it("plays the clean match video under the clickable overlay instead of burned-in boxes", async () => {
  serve([...FULL, "sample.mp4"]); renderWithProviders(<VideoLabPage />);
  const video = await screen.findByLabelText("Match video");
  expect(video.getAttribute("src")).toMatch(/\/files\/sample\.mp4$/);
});

it("while playing through the list, the next moment starts after the current clip", async () => {
  serve(); renderWithProviders(<VideoLabPage />);
  const rail = await screen.findByRole("complementary", { name: "Match moments" });
  await userEvent.click(await within(rail).findByRole("button", { name: /corner/i }));
  const video = screen.getByLabelText("Match video") as HTMLVideoElement;
  fireEvent.play(video);
  video.currentTime = 15;
  fireEvent.timeUpdate(video);
  await waitFor(() => expect(played).toHaveBeenLastCalledWith(17));
});

it("names annotated.mp4 as raw detections and offers the analysed video as seen in the lab", async () => {
  serve([...FULL, "sample.mp4"]); renderWithProviders(<VideoLabPage />);
  const downloads = (await screen.findByText("Download results")).closest("details")!;
  expect(within(downloads).getByRole("link", { name: /raw detections \(annotated\.mp4\)/i })).toHaveAttribute("href", expect.stringMatching(/\/files\/annotated\.mp4$/));
  expect(within(downloads).queryByRole("link", { name: "Download annotated.mp4" })).toBeNull();
  // jsdom has no MediaRecorder: the control says why instead of failing silently.
  expect(within(downloads).getByRole("button", { name: "Export analysed video" })).toBeDisabled();
  expect(within(downloads).getByText(/cannot record video/i)).toBeInTheDocument();
});

it("records the analysed video with progress and can be cancelled without saving", async () => {
  class Recorder { static isTypeSupported = (t: string) => t.startsWith("video/mp4"); state = "inactive"; ondataavailable = null; onstop = null; start() { this.state = "recording"; } stop() { this.state = "inactive"; } }
  vi.stubGlobal("MediaRecorder", Recorder);
  const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  const had = "captureStream" in proto;
  proto.captureStream = () => ({ getTracks: () => [], addTrack: () => undefined });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: () => undefined } as unknown as CanvasRenderingContext2D);
  try {
    serve([...FULL, "sample.mp4"]); renderWithProviders(<VideoLabPage />);
    const downloads = (await screen.findByText("Download results")).closest("details")!;
    await userEvent.click(within(downloads).getByRole("button", { name: "Export analysed video" }));
    expect(await within(downloads).findByRole("progressbar", { name: "Recording analysed video" })).toBeInTheDocument();
    await userEvent.click(within(downloads).getByRole("button", { name: "Cancel export" }));
    expect(await within(downloads).findByText(/Export cancelled\. Nothing was saved\./)).toBeInTheDocument();
    expect(within(downloads).getByRole("button", { name: "Export analysed video" })).toBeEnabled();
  } finally { if (!had) delete proto.captureStream; }
});
