import { MonitorPlay, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api/client";
import { type DownloadEntry, hudlAgeGroups, hudlRequest, useHudlLibrary } from "../../api/hudl";
import { fixtureLabel } from "../../lib/hudlFixture";
import { matchScore, useScoreCorrections } from "../../lib/matchScore";
import { formatBytes } from "../../lib/format";
import { Button } from "../ui/Button";

type MediaStatus = { enabled: boolean; folder: string };
type MediaResult = MediaStatus & { created: number; updated: number; failed: string[]; copied?: number; copied_bytes?: number };
type MatchContext = { label: string; ours?: number; theirs?: number };
export type MediaContext = { club: string | null; player: string | null; matches: Record<string, MatchContext> };

const NAME = "Media library for Plex and other players";

/** Spec 220: one folder per download with a readable name, poster and details file,
 *  for Plex, Jellyfin and other players. Off until the owner turns it on. The helper
 *  cannot see the app's club, player or scores, so this page sends them. */
export function MediaLibraryPanel({ entries }: { entries: DownloadEntry[] }) {
  const qc = useQueryClient();
  const status = useQuery<MediaStatus>({ queryKey: ["hudl-media"], queryFn: () => hudlRequest("/downloads/media"), retry: false });
  const prefs = useQuery({ queryKey: ["preferences"], queryFn: api.preferences, retry: false });
  const id = prefs.data?.primary_player_id ?? null;
  const player = useQuery({ queryKey: ["player", id], queryFn: () => api.player(id!), enabled: id != null, retry: false });
  const library = useHudlLibrary();
  const corrections = useScoreCorrections();
  const [result, setResult] = useState<MediaResult | null>(null);
  const ready = !prefs.isPending && (id == null || !player.isPending) && !library.isPending && !corrections.isPending;

  const context = (): MediaContext => {
    const club = player.data?.club_name || null;
    const matches: Record<string, MatchContext> = {};
    for (const matchId of new Set(entries.flatMap((e) => e.matches))) {
      const match = library.data?.find((m) => m.id === matchId);
      if (!match) continue;
      const score = matchScore(match, club, corrections.data);
      matches[matchId] = { label: fixtureLabel(match.title, club, hudlAgeGroups(match)[0]), ...(score && { ours: score.ours, theirs: score.theirs }) };
    }
    return { club, player: player.data?.display_name ?? null, matches };
  };
  const update = useMutation({
    mutationFn: (enabled?: boolean) => hudlRequest<MediaResult>("/downloads/media", { ...(enabled !== undefined && { enabled }), context: context() }),
    onSuccess: (data) => {
      setResult(data.enabled ? data : null);
      qc.setQueryData(["hudl-media"], { enabled: data.enabled, folder: data.folder });
    },
  });

  if (!status.data) return null;
  const on = status.data.enabled;
  const failed = result?.failed.length ?? 0;
  const copied = result?.copied ?? 0;
  return (
    <section aria-label="Media library" className="panel flex flex-wrap items-center gap-4 p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-800 text-accent"><MonitorPlay size={20} aria-hidden /></span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">{NAME}</p>
        {on ? (
          <p className="text-xs text-fg-muted">
            Each download has its own folder with a readable name, the match poster and a details file (date, teams, score, moments).
            Point Plex or Jellyfin at this folder only: <span className="font-mono break-all text-fg-subtle">{status.data.folder}</span>
          </p>
        ) : (
          <p className="text-xs text-fg-muted">
            Adds a folder with a readable name, poster and details file for each download. Your downloads are not changed. It uses no extra disk space, except on network shares and exFAT or FAT drives, where it keeps a copy of each video.
          </p>
        )}
        {result && failed === 0 && (
          <p className="text-xs text-fg-subtle">{result.created === 0 && result.updated === 0 ? "Up to date." : `${result.created} files added, ${result.updated} details updated.`}</p>
        )}
        {copied > 0 && (
          <p className="text-xs text-fg-subtle">
            This drive cannot link files (network shares such as a NAS, exFAT and FAT drives), so {copied} {copied === 1 ? "video was" : "videos were"} copied ({formatBytes(result?.copied_bytes ?? 0)}).
          </p>
        )}
        {failed > 0 && (
          <p role="alert" className="text-xs text-warn">
            {failed} {failed === 1 ? "download could not be added" : "downloads could not be added"}; your downloads are unchanged. Check the drive has free space, then press Update.
          </p>
        )}
        {update.error && <p role="alert" className="text-xs text-danger">{update.error.message}</p>}
      </div>
      {on && <Button variant="ghost" disabled={!ready || update.isPending} onClick={() => update.mutate(undefined)}><RefreshCw size={14} aria-hidden /> Update</Button>}
      <button type="button" role="switch" aria-checked={on} aria-label={NAME} disabled={!ready || update.isPending} onClick={() => update.mutate(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${on ? "bg-gradient-to-r from-[#2563eb] to-accent-strong" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} />
      </button>
    </section>
  );
}
