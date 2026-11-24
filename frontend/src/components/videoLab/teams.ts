import type { ActorCandidate, AppearanceTrack, Assignment, GroupLabel, Observation, Role, Team, TrackLabel } from "./labTypes";

const NONE: Assignment = { team: null, role: null, source: "none", confidence: 0 };
// Calibrated by eye on the ten-minute Veo match (spec 580): 9 labels → 406 suggestions, no
// visible team mistakes on checked frames. SIMILAR/MARGIN when several labels compete, ALONE
// when only one kind of label exists yet.
const SIMILAR = 0.45;
const MARGIN = 0.08;
const ALONE = 0.6;

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Appearance (ReID) and shirt colour together. Colour ignores brightness (Lab a*, b*) so the
 * same kit in sun and shade still matches; it carries most weight because it decides teams. */
function similarity(a: AppearanceTrack, b: AppearanceTrack) {
  const look = cosine(a.v, b.v);
  if (!a.kit || !b.kit) return look;
  const kit = Math.exp(-Math.hypot(a.kit[1] - b.kit[1], a.kit[2] - b.kit[2]) / 18);
  return 0.35 * look + 0.65 * kit;
}

/**
 * Team and role per track: your label wins, then your label for its appearance group, then
 * the closest labelled people in appearance space when they agree. Otherwise unassigned.
 */
export function propagateTeams(tracks: AppearanceTrack[], trackLabels: TrackLabel[], groupLabels: GroupLabel[], observations: Observation[], offPitch: Set<number> = new Set()): Map<number, Assignment> {
  const result = new Map<number, Assignment>();
  const own = new Map(trackLabels.map(l => [l.track_id, l]));
  const groups = new Map(groupLabels.map(l => [l.group_id, l]));
  for (const label of trackLabels) result.set(label.track_id, { team: label.team, role: label.role, source: "you", confidence: 1 });
  if (!tracks.length) {
    const votes = new Map<number, Map<string, number>>();
    for (const row of observations) {
      if (row.team_id !== "own" && row.team_id !== "opponent") continue;
      const bucket = votes.get(row.track_id) ?? new Map<string, number>();
      bucket.set(row.team_id, (bucket.get(row.team_id) ?? 0) + 1);
      votes.set(row.track_id, bucket);
    }
    for (const [track, bucket] of votes) {
      if (result.has(track)) continue;
      const [team, count] = [...bucket].sort((a, b) => b[1] - a[1])[0];
      const total = [...bucket.values()].reduce((a, b) => a + b, 0);
      if (count / total >= 0.8) result.set(track, { team: team as Team, role: "player", source: "model", confidence: count / total });
    }
    return result;
  }
  const anchors = tracks.filter(t => own.has(t.track_id));
  for (const track of tracks) {
    if (result.has(track.track_id)) continue;
    // People seen mostly off the marked pitch (spec 600) get no suggested team.
    if (offPitch.has(track.track_id)) { result.set(track.track_id, NONE); continue; }
    // Closest labelled person per label (team + role). On real Veo footage absolute similarity
    // varies with light; "clearly closer to one label than any other" is what holds up.
    const best = new Map<string, number>();
    for (const anchor of anchors) {
      const label = own.get(anchor.track_id)!, key = `${label.team}|${label.role}`;
      best.set(key, Math.max(best.get(key) ?? -1, similarity(track, anchor)));
    }
    const [first, second] = [...best].sort((x, y) => y[1] - x[1]);
    const clear = first && (second ? first[1] >= SIMILAR && first[1] - second[1] >= MARGIN : first[1] >= ALONE);
    if (clear) {
      const [team, role] = first[0].split("|");
      result.set(track.track_id, { team: team === "null" ? null : team as Team, role: role as Role, source: "similar", confidence: first[1] });
      continue;
    }
    const group = groups.get(track.group);
    result.set(track.track_id, group ? { team: group.team, role: group.role, source: "group", confidence: 0.6 } : NONE);
  }
  return result;
}

/** Which team probably made an action: weighted by closeness, only when the nearby players agree. */
export function estimateActionTeam(candidates: ActorCandidate[], teams: Map<number, Assignment>): { team: Team | null; evidence: ActorCandidate["evidence"] | null } {
  const votes = new Map<Team, number>();
  let total = 0, evidence: ActorCandidate["evidence"] | null = null;
  for (const candidate of candidates) {
    const weight = (candidate.evidence === "camera_focus" ? 0.5 : 1) / (1 + (candidate.distance ?? 1));
    total += weight;
    const info = teams.get(candidate.track_id);
    if (!info?.team || info.role === "referee" || info.role === "other") continue;
    votes.set(info.team, (votes.get(info.team) ?? 0) + weight);
    evidence ??= candidate.evidence;
  }
  const best = [...votes].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] / total >= 0.6 ? { team: best[0], evidence } : { team: null, evidence: null };
}
