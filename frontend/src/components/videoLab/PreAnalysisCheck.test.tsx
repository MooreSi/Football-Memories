import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { PreAnalysisCheck } from "./PreAnalysisCheck";

const summary = { sampled_frames: 720, person_detections: 22995, ball_detections: 444, unique_tracklets: 549, ball_observation_coverage: 0.57, football_events_confirmed: 0 };
const atlas = { projection: { kind: "cylindrical" }, times: [0, 1, 2, 3], frame_to_panorama: [[1], [1], [1], null], pitch_outline: { method: "painted_lines", unseen_sides: [false, true, false, false], centre_circle: true } };

it("lists each pre-analysis check with its status and counts ready ones", () => {
  render(<PreAnalysisCheck summary={summary} atlas={atlas} groups={6} trackLabels={[{ track_id: 4, team: "own", role: "player" }]} groupLabels={[{ group_id: 2, team: null, role: "referee" }]} />);
  const region = screen.getByRole("region", { name: "Pre-analysis check" });
  expect(within(region).getByText("3 of 6 ready")).toBeInTheDocument();
  const row = (name: string) => within(region).getByText(name).closest("li")!;
  expect(row("Whole-pitch panorama")).toHaveTextContent("Partly");
  expect(row("Whole-pitch panorama")).toHaveTextContent("3 of 4 camera views");
  expect(row("Pitch outline and bird's-eye")).toHaveTextContent("1 side estimated");
  expect(row("Teams")).toHaveTextContent("Label one player from the other team");
  expect(row("Referee")).toHaveTextContent("Ready");
});
