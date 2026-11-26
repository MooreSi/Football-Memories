/**
 * Pre-analysis (owner request 26 November 2026): one scan sized to give the lab enough footage for a
 * whole-pitch panorama, the pitch outline (homography), players, referee, ball and teams.
 *
 * How much to scan: the worker caps one analysis at 600 s, and a follow-cam only reaches both goals
 * when play does. On 260926 NL a 4-minute window never produced a detection of the left goal, while
 * the 10-minute runs reach both ends. So the scan takes the full ten minutes, starting at minute five
 * so warm-ups and the kick-off line-up (players stood still, coaches on the pitch) are behind it.
 */
export const SCAN_S = 600, SETTLED_START_S = 300;
export type ScanPlan = { start_s: number; duration_s: number; reason: string };

export function scanPlan(matchDurationS: number | null | undefined): ScanPlan | null {
  const known = typeof matchDurationS === "number" && Number.isFinite(matchDurationS) && matchDurationS > 0;
  if (!known) return { start_s: SETTLED_START_S, duration_s: SCAN_S, reason: "Ten minutes of settled play from minute 5 (match length unknown)." };
  if (matchDurationS < 60) return null;
  if (matchDurationS < SCAN_S) return { start_s: 0, duration_s: Math.floor(matchDurationS / 60) * 60, reason: "The whole match, as it is shorter than ten minutes." };
  const start = Math.min(SETTLED_START_S, Math.floor((matchDurationS - SCAN_S) / 60) * 60);
  return { start_s: start, duration_s: SCAN_S, reason: `Ten minutes of play from minute ${start / 60}, enough for the camera to reach both ends.` };
}

export type Status = "ready" | "partial" | "missing";
export type Check = { key: "panorama" | "outline" | "players" | "ball" | "teams" | "referee"; label: string; status: Status; detail: string };
type AtlasLike = { projection?: unknown; frame_to_panorama: (unknown[] | null)[]; times: number[]; pitch_outline?: { method: string; unseen_sides?: boolean[]; centre_circle?: boolean; halfway?: unknown } | null };
type SummaryLike = { sampled_frames: number; person_detections: number; ball_observation_coverage: number };
export type ReadinessInput = { summary?: SummaryLike; atlas?: AtlasLike; groups: number; labels: { own: boolean; opponent: boolean; referee: boolean } };

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Provisional thresholds (recorded as an open owner decision): a checklist, never a score of accuracy. */
export function readiness({ summary, atlas, groups, labels }: ReadinessInput): Check[] {
  const checks: Check[] = [];
  const total = atlas?.times.length ?? 0, solved = atlas?.frame_to_panorama.filter(Boolean).length ?? 0, share = total ? solved / total : 0;
  checks.push(!atlas?.projection || !total
    ? { key: "panorama", label: "Whole-pitch panorama", status: "missing", detail: "No stitched pitch in this run. Build the stitched pitch." }
    : { key: "panorama", label: "Whole-pitch panorama", status: share >= 0.9 ? "ready" : share >= 0.6 ? "partial" : "missing", detail: `${solved} of ${total} camera views placed on the panorama (${pct(share)}).` });
  const outline = atlas?.pitch_outline;
  if (!outline || outline.method !== "painted_lines") checks.push({ key: "outline", label: "Pitch outline and bird's-eye", status: "missing", detail: "No painted-line outline was found. Mark the pitch in the stitched pitch review." });
  else {
    const unseen = (outline.unseen_sides ?? []).filter(Boolean).length;
    const marks = [outline.halfway ? "halfway line" : null, outline.centre_circle ? "centre circle" : null].filter(Boolean).join(" and ");
    checks.push({ key: "outline", label: "Pitch outline and bird's-eye", status: unseen ? "partial" : "ready",
      detail: `${unseen ? `${unseen} side${unseen > 1 ? "s" : ""} estimated, not seen` : "All four sides found in the painted lines"}${marks ? `; ${marks} found` : ""}. Automatic: check it before relying on positions.` });
  }
  const perFrame = summary && summary.sampled_frames ? summary.person_detections / summary.sampled_frames : 0;
  checks.push({ key: "players", label: "People detected", status: perFrame >= 10 ? "ready" : perFrame >= 4 ? "partial" : "missing",
    detail: summary ? `${perFrame.toFixed(1)} people per sampled frame (includes the sideline until the pitch outline excludes it).` : "No detection summary." });
  const ball = summary?.ball_observation_coverage ?? 0;
  checks.push({ key: "ball", label: "Ball", status: ball >= 0.5 ? "ready" : ball >= 0.25 ? "partial" : "missing", detail: `Ball seen in ${pct(ball)} of sampled frames.` });
  const both = labels.own && labels.opponent;
  checks.push({ key: "teams", label: "Teams", status: !groups ? "missing" : both ? "ready" : "partial",
    detail: !groups ? "No player look-alike groups. Prepare player grouping." : both ? "Both kits taught; teams are decided moment by moment from them." : `${groups} look-alike groups ready. Label one player from ${labels.own || labels.opponent ? "the other team" : "each team"} to decide teams.` });
  checks.push({ key: "referee", label: "Referee", status: labels.referee ? "ready" : groups ? "partial" : "missing",
    detail: labels.referee ? "Referee kit taught; one referee is kept on the pitch." : "Label the referee once so their kit is recognised." });
  return checks;
}
