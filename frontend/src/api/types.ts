// Mirrors backend/app/schemas.py. Keep in step with the API.
export interface MatchSummary {
  id: number;
  team_id: number;
  team_name: string;
  season_id: number;
  season_label: string;
  age_group: string | null;
  opponent: string;
  match_date: string;
  competition: string | null;
  event_count: number;
  media_id: number | null;
  duration_s: number | null;
  thumbnail_url: string | null;
  offline: boolean;
}

export interface MatchPage {
  total: number;
  page: number;
  page_size: number;
  items: MatchSummary[];
}

export interface MediaInfo {
  id: number;
  stream_url: string;
  thumbnail_url: string | null;
  available: boolean;
  duration_s: number;
  width: number | null;
  height: number | null;
  fps: number | null;
  video_codec: string | null;
  audio_codec: string | null;
  size_bytes: number;
  original_filename: string;
}

export interface MatchEvent {
  id: number;
  time_s: number;
  duration_s: number;
  category: string;
  players: string[];
  note: string;
  favourite?: boolean;
  viewed?: boolean;
}

export interface MatchDetail extends MatchSummary {
  media: MediaInfo | null;
  events: MatchEvent[];
}

export interface NamedItem {
  id: number;
  name: string;
}

export interface InboxFile {
  filename: string;
  size_bytes: number;
  has_tags: boolean;
}

export interface Connector {
  id: string;
  name: string;
  available: boolean;
  reason: string;
  docs: string;
  limitations: string[];
  capabilities: Record<string, boolean>;
}

export interface ImportBody {
  filename: string;
  team_name: string;
  season_label: string;
  opponent: string;
  match_date: string;
  age_group: string | null;
  competition: string | null;
}

export interface RecentMoment {
  event_id: number;
  match_id: number;
  time_s: number;
  category: string;
  players: string[];
  team_name: string;
  opponent: string;
  match_date: string;
}

export interface Stats {
  matches: number;
  moments: number;
  footage_seconds: number;
  teams: number;
  players: number;
  top_tags: { name: string; count: number }[];
  recent_moments: RecentMoment[];
}

export interface PlayerListItem {
  id: number;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_url: string | null;
  moments: number;
  matches: number;
}

export interface PlayerProfile {
  id: number;
  display_name: string;
  shirt_number: string | null;
  position: string | null;
  photo_url: string | null;
  is_primary: boolean;
  totals: { matches: number; moments: number; unwatched: number; favourites: number };
  categories: { name: string; count: number }[];
  teams: { team_name: string; season_label: string; age_group: string | null; matches: number }[];
  per_match: { match_id: number; match_date: string; opponent: string; moments: number; href?: string }[];
  teammates: { id: number; display_name: string; shared_moments: number }[];
  first_match_date: string | null;
  latest_match_date: string | null;
}

export interface PlayerMoment {
  event_id: number;
  match_id: number;
  time_s: number;
  duration_s: number;
  category: string;
  players: string[];
  note: string;
  favourite: boolean;
  viewed: boolean;
  team_name: string;
  opponent: string;
  match_date: string;
  season_label: string;
  age_group: string | null;
  media_id: number | null;
  stream_url: string | null;
  thumbnail_url: string | null;
  match_duration_s: number | null;
}

export interface MomentItem extends PlayerMoment {
  offline: boolean;
}

export interface Facet {
  id: number | null;
  name: string;
  count: number;
}

export interface Facets {
  categories: Facet[];
  players: Facet[];
  teams: Facet[];
  seasons: Facet[];
  matches: Facet[];
}

export interface PlaylistSummary {
  id: number;
  name: string;
  item_count: number;
  total_seconds: number;
  updated_at: string;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  items: MomentItem[];
}

export interface MomentFilters {
  categories: string[];
  playerIds: number[];
  playerMode: "any" | "all";
  teamId?: number;
  seasonId?: number;
  dateFrom?: string;
  dateTo?: string;
  favourites: boolean;
  unwatched: boolean;
  q?: string;
  sort: "newest" | "oldest";
}

export interface AppSettings {
  clip_pre_s: number;
  clip_post_s: number;
}

export interface FolderHealth {
  role: "archive" | "inbox";
  path: string;
  exists: boolean;
  readable: boolean;
  writable: boolean;
  free_bytes: number | null;
  total_bytes: number | null;
  status: "ok" | "warning" | "error";
  messages: string[];
}

export interface StorageHealth {
  folders: FolderHealth[];
  archive: {
    indexed_files: number;
    indexed_bytes: number;
    missing: { media_id: number; match_id: number; opponent: string; match_date: string; relative_path: string }[];
  };
}

export interface BackupInfo {
  name: string;
  kind: "manual" | "auto" | "pre-restore" | "uploaded";
  created_at: string;
  size_bytes: number;
  matches: number;
  moments: number;
}

export interface VerifyState {
  state: "idle" | "running" | "done";
  checked: number;
  total: number;
  started_at: string | null;
  finished_at: string | null;
  results: { media_id: number; match_id: number; opponent: string; result: "ok" | "changed" | "missing" }[];
}

export interface ReelItem {
  id: number;
  position: number;
  pre_s: number | null;
  post_s: number | null;
  start_s: number;
  end_s: number;
  moment: MomentItem;
}

export interface ReelSummary {
  id: number;
  name: string;
  status: "draft" | "queued" | "rendering" | "done" | "failed";
  progress: number;
  error: string | null;
  item_count: number;
  planned_seconds: number;
  output_relpath: string | null;
  output_bytes: number | null;
  output_duration_s: number | null;
  output_width: number | null;
  output_height: number | null;
  video_url: string | null;
  thumbnail_url: string | null;
  updated_at: string;
  rendered_at: string | null;
}

export interface ReelDetail extends ReelSummary {
  opening_title: string | null;
  opening_subtitle: string | null;
  closing_text: string | null;
  has_opening_card: boolean;
  has_closing_card: boolean;
  items: ReelItem[];
}

export interface ReelItemInput {
  event_id: number;
  pre_s: number | null;
  post_s: number | null;
}
