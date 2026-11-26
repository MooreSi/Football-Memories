/**
 * Pre-analysis (owner request 26 November 2026): one scan sized to give the lab enough footage for a
 * whole-pitch panorama, the pitch outline (homography), players, referee, ball and teams.
 *
 * How much to scan: the worker caps one analysis at 600 s, and a follow-cam only reaches both goals
 * when play does. On 260926 NL a 4-minute window never produced a detection of the left goal, while
 * the 10-minute runs reach both ends. So the scan takes the full ten minutes of first-half play.
 * Veo recordings start well before kick-off (261122 NL vs Bournville Greens: 10:00; RCW vs CG 9:09;
 * NL 260926 3:57), and a scan from minute five there was half warm-up. Veo's `halves` give the kick-off,
 * so the scan starts one minute after it, once the line-up has broken up. Without halves (Hudl), minute five.
 */
export const AFTER_KICK_OFF_S = 60;
/** A listed half shorter than this is a fragment, not a half (261116 RMC listed 0:00-3:47 first). */
export const FRAGMENT_S = 300;
export const SCAN_S = 600, SETTLED_START_S = 300;
export type ScanPlan = { start_s: number; duration_s: number; reason: string };

export function scanPlan(matchDurationS: number | null | undefined, halves?: number[][] | null): ScanPlan | null {
  const first = halves?.find(h => h.length === 2 && h[1] - h[0] >= FRAGMENT_S) ?? halves?.[0];
  if (first && first.length === 2 && first[0] >= 0 && first[1] > first[0] && (!matchDurationS || first[1] <= matchDurationS + 1)) {
    const start = Math.ceil(first[0]) + AFTER_KICK_OFF_S, room = Math.floor(first[1]) - start;
    const duration = room >= SCAN_S ? SCAN_S : Math.floor(room / 60) * 60;
    if (duration >= 60) return { start_s: start, duration_s: duration, reason: `${duration / 60} minutes of first-half play, starting a minute after Veo's kick-off, enough for the camera to reach both ends.` };
  }
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
/** Below this share of players' positions inside, an outline misses the game (right outlines held 92-98%, short ones 23-37%). */
export const PLAY_HELD = 0.7;
export type ReadinessInput = { summary?: SummaryLike; atlas?: AtlasLike; accepted?: boolean; play?: number | null; groups: number; labels: { own: boolean; opponent: boolean; referee: boolean } };

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Provisional thresholds (recorded as an open owner decision): a checklist, never a score of accuracy. */
export function readiness({ summary, atlas, accepted = false, play = null, groups, labels }: ReadinessInput): Check[] {
  const checks: Check[] = [];
  const total = atlas?.times.length ?? 0, solved = atlas?.frame_to_panorama.filter(Boolean).length ?? 0, share = total ? solved / total : 0;
  checks.push(!atlas?.projection || !total
    ? { key: "panorama", label: "Whole-pitch panorama", status: "missing", detail: "No stitched pitch in this run. Build the stitched pitch." }
    : { key: "panorama", label: "Whole-pitch panorama", status: share >= 0.9 ? "ready" : share >= 0.6 ? "partial" : "missing", detail: `${solved} of ${total} camera views placed on the panorama (${pct(share)}).` });
  const outline = atlas?.pitch_outline;
  const few = typeof play === "number" && play < PLAY_HELD;
  const held = (which: string) => few ? ` Only ${pct(play!)} of players' positions fall inside the ${which} outline: move its edges out to where the game is played.` : typeof play === "number" ? ` It holds ${pct(play)} of players' positions.` : "";
  if (accepted) checks.push({ key: "outline", label: "Pitch outline and bird's-eye", status: few ? "partial" : "ready", detail: `You accepted the pitch outline.${held("accepted")}` });
  else if (!outline || outline.method !== "painted_lines") checks.push({ key: "outline", label: "Pitch outline and bird's-eye", status: "missing", detail: "No painted-line outline was found. Mark the pitch in the stitched pitch review." });
  else {
    const unseen = (outline.unseen_sides ?? []).filter(Boolean).length;
    const marks = [outline.halfway ? "halfway line" : null, outline.centre_circle ? "centre circle" : null].filter(Boolean).join(" and ");
    // Four sides found is not proof of the right pitch; only an outline that holds the play and that you checked is ready.
    checks.push({ key: "outline", label: "Pitch outline and bird's-eye", status: "partial",
      detail: `${unseen ? `${unseen} side${unseen > 1 ? "s" : ""} estimated, not seen` : "All four sides found in the painted lines"}${marks ? `; ${marks} found` : ""}.${held("automatic")} Automatic: check that it frames the pitch the match is played on, then accept it in the stitched pitch review.` });
  }
  const perFrame = summary && summary.sampled_frames ? summary.person_detections / summary.sampled_frames : 0;
  checks.push({ key: "players", label: "People detected", status: perFrame >= 10 ? "ready" : perFrame >= 4 ? "partial" : "missing",
    detail: summary ? `${perFrame.toFixed(1)} people per sampled frame, counting the sideline and any game on a neighbouring pitch until the accepted outline excludes them.` : "No detection summary." });
  const ball = summary?.ball_observation_coverage ?? 0;
  checks.push({ key: "ball", label: "Ball", status: ball >= 0.5 ? "ready" : ball >= 0.25 ? "partial" : "missing", detail: `A ball seen in ${pct(ball)} of sampled frames (spare balls and other pitches count; the lab follows one smooth path).` });
  const both = labels.own && labels.opponent;
  checks.push({ key: "teams", label: "Teams", status: !groups ? "missing" : both ? "ready" : "partial",
    detail: !groups ? "No player look-alike groups. Prepare player grouping." : both ? "Both kits taught; teams are decided moment by moment from them." : `${groups} look-alike groups ready. Label one player from ${labels.own || labels.opponent ? "the other team" : "each team"} to decide teams.` });
  checks.push({ key: "referee", label: "Referee", status: labels.referee ? "ready" : groups ? "partial" : "missing",
    detail: labels.referee ? "Referee kit taught; one referee is kept on the pitch." : "Label the referee once so their kit is recognised." });
  return checks;
}
