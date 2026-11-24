import type { PitchKeyframe } from "./pitch";
import type { PitchSize } from "./metres";

/** Video Lab (spec 580) shared shapes. Everything from the worker is unconfirmed until reviewed. */
export type Team = "own" | "opponent";
export type Role = "player" | "goalkeeper" | "referee" | "other";
export const ACTION_TYPES = [
  "goal", "shot", "pass", "high_pass", "cross", "drive", "header", "tackle", "player_successful_tackle",
  "ball_player_block", "throw_in", "corner", "free_kick", "goal_kick", "kick_off", "foul", "out_of_play", "save", "other",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export type ActorCandidate = { track_id: number; evidence: "ball_nearest" | "camera_focus" | "unreviewed_ball_proximity"; distance?: number; score?: number };
export type Suggestion = { id: string; type: string; time_s: number; score?: number; source_time_s?: number; actor_candidates?: ActorCandidate[] };
export type VeoEvent = { id: string; type: string; time_s: number; side?: string; source_time_s?: number };
export type VeoHighlight = { source_id?: string; source_label?: string; time_s: number; source_time_s?: number };
export type VeoTags = { events: VeoEvent[]; highlights: VeoHighlight[] };

export type AppearanceTrack = { track_id: number; group: number; start_s: number; end_s: number; thumb: number; v: number[]; kit?: number[] | null };
export type AppearanceGroup = { id: number; size: number; colour_hex: string | null; examples: number[] };
export type Appearance = { groups: AppearanceGroup[]; tracks: AppearanceTrack[]; sprite: { file: string; cols: number; w: number; h: number } };

export type ReviewEvent = { id: string; type: ActionType; time_s: number; track_id: number | null; confirmed: boolean; team?: Team | null };
export type TrackLabel = { track_id: number; team: Team | null; role: Role };
export type GroupLabel = { group_id: number; team: Team | null; role: Role };
export type Identity = { track_id: number; player_id: string; start_s: number; end_s: number };
export type Review = {
  revision: number; source_sha256: string; events: ReviewEvent[]; identities: Identity[];
  reviewed_intervals: [number, number][]; review_complete: boolean;
  track_labels: TrackLabel[]; group_labels: GroupLabel[]; rejected_suggestions: string[];
  pitch_keyframes?: PitchKeyframe[];
  pitch_size?: PitchSize | null;
};

export type Assignment = { team: Team | null; role: Role | null; source: "you" | "group" | "similar" | "model" | "none"; confidence: number };
export type Observation = { track_id: number; time_s: number; team_id: string | null; role: string; image_box?: number[] };
export type Assignments = { image_width: number; image_height: number; observations: Observation[] };

export const teamName = (team: Team | null | undefined) => team === "own" ? "Our team" : team === "opponent" ? "Opponent" : "Unassigned";
export const typeName = (type: string) => type.replaceAll("_", " ");
export const clock = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
