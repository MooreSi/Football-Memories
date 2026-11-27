import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AtlasReview } from "./AtlasReview";
import type { Panorama, PanoramaReview } from "./panorama";

const goalPoints = [[0.1, 0.8], [0.9, 0.8], [0.85, 0.4], [0.15, 0.4]] as [number, number][];
const halfway = [[0.5, 0.85], [0.5, 0.38]] as [number, number][];
const data = {
  panorama_id: "c".repeat(64), source_sha256: "b".repeat(64), width: 2400, height: 900, image: "pitch_atlas.jpg", times: [0, 1], cuts: [false, false],
  frame_to_panorama: [[1, 0, 0, 0, 1, 0, 0, 0, 1], [1, 0, 0, 0, 1, 0, 0, 0, 1]], keyframe_times: [],
  projection: { kind: "cylindrical", origin: [-1.6, -0.1], span: [3.2, 1.6] },
  suggested_boundary: goalPoints,
  pitch_outline: { method: "goal_symmetric", halfway, format: "9v9", size: { length_m: 73, width_m: 46 }, widened: false, play: 0.94, painted_play: 0.83 },
} as unknown as Panorama;
const accepted: PanoramaReview = { panorama_id: data.panorama_id, points: [[0.05, 0.7], [0.95, 0.7], [0.9, 0.2], [0.1, 0.2]], halfway: [[0.3, 0.75], [0.3, 0.25]], accepted: true };

it("explains the outline from the goals and offers it in place of an outline you accepted earlier (Stoke)", async () => {
  const onAccept = vi.fn();
  render(<AtlasReview jobId="j" sourceHash={data.source_sha256} data={data} review={accepted} onAccept={onAccept} onQueued={() => undefined} />);
  expect(screen.getByText(/kick-off spot is half way between them/)).toHaveTextContent("9v9 shape (age group in the title), 73 x 46 m");
  expect(screen.getByText(/holds 94% of play \(painted-line outline 83%\)/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Use the outline from the goals" }));
  await userEvent.click(screen.getByRole("button", { name: "Accept pitch calibration" }));
  expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ points: goalPoints, halfway, accepted: true }));
});

it("does not offer the goal outline again once it is the accepted one", () => {
  render(<AtlasReview jobId="j" sourceHash={data.source_sha256} data={data} review={{ ...accepted, points: goalPoints }} onAccept={() => undefined} onQueued={() => undefined} />);
  expect(screen.queryByRole("button", { name: "Use the outline from the goals" })).toBeNull();
});
