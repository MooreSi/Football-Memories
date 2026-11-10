import type {
  Connector, ImportBody, InboxFile, MatchDetail, MatchPage, MatchSummary, AppSettings, BackupInfo, ReelDetail, ReelItemInput, ReelSummary, Facets, VerifyState, MomentFilters, StorageHealth, MomentItem, NamedItem, PlayerListItem, PlaylistDetail, PlaylistSummary, PlayerMoment, PlayerProfile, Stats,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === "string" ? detail : (detail as { message?: string })?.message ?? `HTTP ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, body?.detail ?? body);
  return body as T;
}

export interface MatchQuery {
  q?: string;
  teamId?: number;
  seasonId?: number;
  ageGroup?: string;
  page: number;
  pageSize?: number;
}

export const api = {
  matches(query: MatchQuery): Promise<MatchPage> {
    const p = new URLSearchParams({ page: String(query.page), page_size: String(query.pageSize ?? 24) });
    if (query.q) p.set("q", query.q);
    if (query.teamId) p.set("team_id", String(query.teamId));
    if (query.ageGroup) p.set("age_group", query.ageGroup);
    if (query.seasonId) p.set("season_id", String(query.seasonId));
    return request(`/api/matches?${p}`);
  },
  match: (id: number) => request<MatchDetail>(`/api/matches/${id}`),
  teams: () => request<NamedItem[]>("/api/teams"),
  seasons: () => request<NamedItem[]>("/api/seasons"),
  inbox: () => request<InboxFile[]>("/api/imports/inbox"),
  importMatch: (body: ImportBody) =>
    request<MatchSummary>("/api/imports", { method: "POST", body: JSON.stringify(body) }),
  connectors: () => request<Connector[]>("/api/connectors"),
  stats: () => request<Stats>("/api/stats"),
  preferences: () => request<{ primary_player_id: number | null }>("/api/preferences"),
  setPrimaryPlayer: (playerId: number | null) =>
    request<{ primary_player_id: number | null }>("/api/preferences/primary-player", {
      method: "PUT",
      body: JSON.stringify({ player_id: playerId }),
    }),
  players: () => request<PlayerListItem[]>("/api/players"),
  player: (id: number) => request<PlayerProfile>(`/api/players/${id}`),
  updatePlayer: (id: number, body: Partial<Pick<PlayerProfile, "display_name" | "shirt_number" | "position">>) =>
    request<PlayerProfile>(`/api/players/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  playerMoments(id: number, f: { category?: string; favourites?: boolean; unwatched?: boolean } = {}) {
    const p = new URLSearchParams({ limit: "2000" });
    if (f.category) p.set("category", f.category);
    if (f.favourites) p.set("favourites", "true");
    if (f.unwatched) p.set("unwatched", "true");
    return request<{ total: number; items: PlayerMoment[] }>(`/api/players/${id}/moments?${p}`);
  },
  setFavourite: (eventId: number, favourite: boolean) =>
    request<{ favourite: boolean }>(`/api/events/${eventId}/favourite`, {
      method: "PUT",
      body: JSON.stringify({ favourite }),
    }),
  async uploadPhoto(playerId: number, file: File): Promise<PlayerProfile> {
    const body = new FormData();
    body.append("file", file);
    // No Content-Type header: the browser sets the multipart boundary itself.
    const res = await fetch(`/api/players/${playerId}/photo`, { method: "PUT", body });
    const json = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    if (!res.ok) throw new ApiError(res.status, json?.detail ?? json);
    return json as PlayerProfile;
  },
  removePhoto: (playerId: number) => request<PlayerProfile>(`/api/players/${playerId}/photo`, { method: "DELETE" }),
  moments(f: MomentFilters, limit = 200, offset = 0) {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset), sort: f.sort, player_mode: f.playerMode });
    f.categories.forEach((c) => p.append("category", c));
    f.playerIds.forEach((id) => p.append("player_id", String(id)));
    if (f.teamId) p.set("team_id", String(f.teamId));
    if (f.seasonId) p.set("season_id", String(f.seasonId));
    if (f.dateFrom) p.set("date_from", f.dateFrom);
    if (f.dateTo) p.set("date_to", f.dateTo);
    if (f.favourites) p.set("favourites", "true");
    if (f.unwatched) p.set("unwatched", "true");
    if (f.q) p.set("q", f.q);
    return request<{ total: number; items: MomentItem[] }>(`/api/moments?${p}`);
  },
  facets: () => request<Facets>("/api/moments/facets"),
  playlists: () => request<PlaylistSummary[]>("/api/playlists"),
  playlist: (id: number) => request<PlaylistDetail>(`/api/playlists/${id}`),
  createPlaylist: (name: string, eventIds: number[]) =>
    request<PlaylistDetail>("/api/playlists", { method: "POST", body: JSON.stringify({ name, event_ids: eventIds }) }),
  updatePlaylist: (id: number, body: { name?: string; event_ids?: number[] }) =>
    request<PlaylistDetail>(`/api/playlists/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  async deletePlaylist(id: number): Promise<void> {
    const res = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  },
  settings: () => request<AppSettings>("/api/settings"),
  updateSettings: (body: Partial<AppSettings>) =>
    request<AppSettings>("/api/settings", { method: "PUT", body: JSON.stringify(body) }),
  storageHealth: () => request<StorageHealth>("/api/storage/health"),
  backups: () => request<BackupInfo[]>("/api/backups"),
  createBackup: () => request<BackupInfo>("/api/backups", { method: "POST" }),
  async uploadBackup(file: File): Promise<BackupInfo> {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/backups/upload", { method: "POST", body });
    const json = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    if (!res.ok) throw new ApiError(res.status, json?.detail ?? json);
    return json as BackupInfo;
  },
  restoreBackup: (name: string) =>
    request<{ restored: string; safety_backup: string }>(`/api/backups/${encodeURIComponent(name)}/restore`, {
      method: "POST",
      body: JSON.stringify({ confirm: "RESTORE" }),
    }),
  async deleteBackup(name: string): Promise<void> {
    const res = await fetch(`/api/backups/${encodeURIComponent(name)}`, { method: "DELETE" });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  },
  startVerify: () => request<VerifyState>("/api/storage/verify", { method: "POST" }),
  verifyState: () => request<VerifyState>("/api/storage/verify"),
  relink: () => request<{ relinked: number; still_missing: number }>("/api/storage/relink", { method: "POST" }),
  rebuildThumbnails: () => request<{ rebuilt: number; failed: number }>("/api/storage/rebuild-thumbnails", { method: "POST" }),
  reels: () => request<ReelSummary[]>("/api/reels"),
  reel: (id: number) => request<ReelDetail>(`/api/reels/${id}`),
  createReel: (body: { name: string; items: ReelItemInput[]; opening_title?: string | null; opening_subtitle?: string | null; closing_text?: string | null }) =>
    request<ReelDetail>("/api/reels", { method: "POST", body: JSON.stringify(body) }),
  updateReel: (id: number, body: Partial<{ name: string; items: ReelItemInput[]; opening_title: string | null; opening_subtitle: string | null; closing_text: string | null }>) =>
    request<ReelDetail>(`/api/reels/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  renderReel: (id: number) => request<ReelDetail>(`/api/reels/${id}/render`, { method: "POST" }),
  async uploadCard(id: number, kind: "opening" | "closing", png: Blob): Promise<ReelDetail> {
    const body = new FormData();
    body.append("file", png, `${kind}.png`);
    const res = await fetch(`/api/reels/${id}/cards/${kind}`, { method: "PUT", body });
    const json = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
    if (!res.ok) throw new ApiError(res.status, json?.detail ?? json);
    return json as ReelDetail;
  },
  deleteCard: (id: number, kind: "opening" | "closing") =>
    request<ReelDetail>(`/api/reels/${id}/cards/${kind}`, { method: "DELETE" }),
  async deleteReel(id: number): Promise<void> {
    const res = await fetch(`/api/reels/${id}`, { method: "DELETE" });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
  },
  markViewed: (eventId: number) => request<{ viewed: boolean }>(`/api/events/${eventId}/viewed`, { method: "POST" }),
};
