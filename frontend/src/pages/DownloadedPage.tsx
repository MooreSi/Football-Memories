import { Clapperboard, Download, Film, FolderArchive, HardDriveDownload, Play, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Overlay } from "../components/ui/Overlay";
import { Button } from "../components/ui/Button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { type DownloadEntry, hudlAgeGroups, hudlRequest, useDownloadIndex, useHudlLibrary, useHudlStatus } from "../api/hudl";
import { TeamBadge } from "../components/TeamBadge";
import { MediaLibraryPanel } from "../components/downloads/MediaLibraryPanel";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { formatBytes } from "../lib/format";
import { fixtureDate, fixtureLabel, fixtureParts, ukDate } from "../lib/hudlFixture";
import { useHomeClub } from "../lib/useHomeClub";
import { useVeoTeam } from "../lib/useHomeTeams";
import { useVeoLibrary } from "../api/veo";

type Filter = "all" | "match" | "moments";
const KIND: Record<DownloadEntry["kind"], { label: string; icon: typeof Film }> = {
  match: { label: "Full match", icon: Film },
  moments: { label: "Moments", icon: FolderArchive },
  reel: { label: "Highlight reel", icon: Clapperboard },
};

function describe(e: DownloadEntry): string {
  if (e.kind === "match") return e.moment_count ? `${e.moment_count} tagged moments in the tag file` : "Original quality";
  const what = `${e.moment_count} ${e.moment_count === 1 ? "moment" : "moments"}`;
  const shape = e.kind === "reel" ? "one reel" : e.combined ? "one combined video" : "ZIP, one video per moment";
  return `${what} · ${shape}`;
}

/** Spec 190: everything the helper has downloaded, grouped by match, with metadata. */
export function DownloadedPage() {
  const index = useDownloadIndex();
  const library = useHudlLibrary();
  const hudlClub = useHomeClub();
  const veoTeam = useVeoTeam();
  const veoLibrary = useVeoLibrary();
  const [filter, setFilter] = useState<Filter>("all");
  const [playing, setPlaying] = useState<DownloadEntry | null>(null);
  const [deleting, setDeleting] = useState<DownloadEntry | null>(null);
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: (file: string) => hudlRequest<{ trashed_as: string }>("/downloads/remove", { file }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["hudl-download-index"] }),
  });
  const entries = (index.data ?? []).filter((e) => filter === "all" || (filter === "match" ? e.kind === "match" : e.kind !== "match"));
  const groups = new Map<string, DownloadEntry[]>();
  for (const e of entries) {
    const key = e.matches.length === 1 ? e.matches[0] : e.match_id ?? `files:${e.file}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const counts = { all: index.data?.length ?? 0, match: index.data?.filter((e) => e.kind === "match").length ?? 0,
    moments: index.data?.filter((e) => e.kind !== "match").length ?? 0 };
  const size = (index.data ?? []).reduce((n, e) => n + e.size, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="screen-eyebrow mb-2">ARCHIVE</p>
          <h1 className="text-3xl font-semibold tracking-tight">Downloaded</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Full matches, moments and reels saved on this computer{index.data?.length ? ` · ${formatBytes(size)}` : ""}.
          </p>
        </div>
        <div role="group" aria-label="Show" className="inline-flex gap-1 rounded-full border border-line bg-ink-900/70 p-1">
          {(["all", "match", "moments"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm ${filter === f ? "bg-gradient-to-r from-[#2563eb] to-accent-strong text-white" : "text-fg-muted hover:text-fg"}`}>
              {f === "all" ? "All" : f === "match" ? "Full matches" : "Moments"} <span className="opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </header>
      {remove.error && <p role="alert" className="text-sm text-danger">{remove.error.message}</p>}
      {index.data && index.data.length > 0 && <MediaLibraryPanel entries={index.data} />}
      {index.isPending ? <Spinner label="Reading downloads" /> : index.isError ? (
        <EmptyState icon={HardDriveDownload} title="Downloads unavailable">Start the desktop helper to see what has been downloaded.</EmptyState>
      ) : groups.size === 0 ? (
        <EmptyState icon={HardDriveDownload} title="Nothing downloaded yet">
          Download a full match or its moments from a match page or <Link className="text-accent underline" to="/clips">Clips</Link>.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {[...groups].map(([key, list]) => {
            const isVeo = key.startsWith("veo-");
            const club = isVeo ? veoTeam : hudlClub;
            const veoMatch = isVeo ? veoLibrary.data?.find((m) => m.id === key) : undefined;
            const match = isVeo ? undefined : library.data?.find((m) => m.id === key);
            const title = match?.title ?? veoMatch?.title ?? list[0].title ?? "Downloaded files";
            const age = match ? hudlAgeGroups(match)[0] : veoMatch?.age_group && veoMatch.age_group !== "Unclassified" ? veoMatch.age_group : "";
            const parts = fixtureParts(title, club);
            const date = fixtureDate(title);
            const label = fixtureLabel(title, club, age);
            return (
              <article key={key} aria-label={label} className="panel overflow-hidden">
                <div className="flex gap-4 border-b border-line p-4">
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                    {(match?.thumbnail_url || veoMatch?.poster_url) ? <img crossOrigin="anonymous" src={(match?.thumbnail_url || veoMatch?.poster_url)!} alt="" className="size-full object-cover" />
                      : <Film className="m-auto mt-6 text-fg-subtle" aria-hidden />}
                    {parts && <span className="absolute top-1.5 left-1.5 flex gap-1"><TeamBadge name={club || "Home"} size="sm" /><TeamBadge name={parts.opponent} size="sm" tone="away" /></span>}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-semibold leading-snug">{label}</h2>
                    <p className="text-xs text-fg-muted">{[date && ukDate(date), age, match?.season_label, parts?.venue].filter(Boolean).join(" · ")}</p>
                    {match && <Link to={`/hudl/${encodeURIComponent(match.id)}`} className="text-xs text-accent hover:underline">Open match</Link>}
                    {veoMatch && <Link to={`/veo/${encodeURIComponent(veoMatch.id)}`} className="text-xs text-accent hover:underline">Open match</Link>}
                  </div>
                </div>
                <ul className="divide-y divide-line">
                  {list.map((e) => {
                    const Icon = KIND[e.kind].icon;
                    const name = e.file.split("/").pop()!;
                    return (
                      <li key={e.file} className="flex flex-wrap items-center gap-3 p-4">
                        <Icon size={18} className="shrink-0 text-accent" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{KIND[e.kind].label}</p>
                          <p className="text-xs text-fg-muted">{describe(e)} · {formatBytes(e.size)} · saved {ukDate(new Date(e.created * 1000))}</p>
                          {e.codes.length > 0 && <p className="truncate text-xs text-pin">{e.codes.slice(0, 6).join(", ")}{e.codes.length > 6 ? ` +${e.codes.length - 6}` : ""}</p>}
                          <p className="truncate font-mono text-[11px] text-fg-subtle">{e.file}</p>
                        </div>
                        {/* Three buttons in the height two used to take (3 x 24px + 2 x 3px = 78px). */}
                        <div className="flex flex-col items-stretch gap-[3px]">
                          <button type="button" onClick={() => setPlaying(e)} aria-label={`Play ${name}`}
                            className="inline-flex h-6 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#2563eb] to-accent-strong px-3 text-xs font-semibold text-white hover:brightness-110">
                            <Play size={12} aria-hidden /> Play
                          </button>
                          <a href={e.url} aria-label={`Save ${name}`} className="inline-flex h-6 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10">
                            <Download size={12} aria-hidden /> Save
                          </a>
                          <button type="button" onClick={() => setDeleting(e)} disabled={remove.isPending} aria-label={`Delete ${name}`}
                            className="inline-flex h-6 items-center justify-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 text-xs text-danger hover:bg-danger/20 disabled:opacity-40">
                            <Trash2 size={12} aria-hidden /> Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}
      {playing && <PlayDialog entry={playing} onClose={() => setPlaying(null)} />}
      {deleting && <DeleteDialog entry={deleting} onClose={() => setDeleting(null)}
        onConfirm={() => { remove.mutate(deleting.file); setDeleting(null); }} />}
    </div>
  );
}

/** Owner request 2026-11-12: Delete asks once more, then moves the file to the Trash
 *  (Recycle Bin on Windows) so it can still be put back. */
function DeleteDialog({ entry, onClose, onConfirm }: { entry: DownloadEntry; onClose: () => void; onConfirm: () => void }) {
  const windows = useHudlStatus().data?.platform === "windows";
  const media = useQuery<{ enabled: boolean }>({ queryKey: ["hudl-media"], queryFn: () => hudlRequest("/downloads/media"), retry: false });
  const name = entry.file.split("/").pop()!;
  return (
    <Overlay label={`Delete ${name}?`} onClose={onClose}>
      <h2 className="text-lg font-semibold break-all">Delete {name}?</h2>
      <p className="text-sm text-fg-muted">
        {KIND[entry.kind].label}{entry.title ? ` for ${entry.title}` : ""}, {formatBytes(entry.size)}.{" "}
        {windows ? "It moves to the Recycle Bin, so you can restore it until the Recycle Bin is emptied."
          : "It moves to the Mac's Trash, so you can put it back from Finder until the Trash is emptied."}{" "}
        {media.data?.enabled && "Its Media library folder (the player-friendly copy) goes there too. "}
        If you have not copied it anywhere else, this may be your only copy.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onConfirm}><Trash2 size={14} aria-hidden /> {windows ? "Move to Recycle Bin" : "Move to Trash"}</Button>
      </div>
    </Overlay>
  );
}

/** Owner request 2026-11-11: play the downloaded file itself. A reel is one MP4 with its
 *  animated opening, match and closing cards built in; a moments ZIP plays clip by clip. */
function PlayDialog({ entry, onClose }: { entry: DownloadEntry; onClose: () => void }) {
  const zip = entry.file.toLowerCase().endsWith(".zip");
  const members = useQuery({
    queryKey: ["download-members", entry.file],
    queryFn: () => hudlRequest<{ name: string; url: string }[]>(`/downloads/members?file=${encodeURIComponent(entry.file)}`),
    enabled: zip,
  });
  const [index, setIndex] = useState(0);
  const clips = zip ? members.data ?? [] : [{ name: entry.file.split("/").pop()!, url: entry.url }];
  const clip = clips[Math.min(index, clips.length - 1)];
  const name = entry.file.split("/").pop()!;
  return (
    <Overlay label={`Play ${name}`} onClose={onClose} className="max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{KIND[entry.kind].label}: {entry.title ?? name}</h2>
          <p className="truncate text-xs text-fg-muted">{clip ? (zip ? `${index + 1} of ${clips.length} · ${clip.name}` : name) : "Loading…"}</p>
        </div>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      {members.isError && <p role="alert" className="text-sm text-danger">{members.error.message}</p>}
      {clip && (
        <video key={clip.url} src={clip.url} controls autoPlay playsInline
          onEnded={() => setIndex((i) => (i + 1 < clips.length ? i + 1 : i))}
          className="aspect-video w-full rounded-xl bg-black" />
      )}
      {zip && clips.length > 1 && (
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {clips.map((c, i) => (
            <button key={c.url} type="button" onClick={() => setIndex(i)} aria-current={i === index ? true : undefined}
              className={`rounded-full px-3 py-1 text-xs ${i === index ? "bg-accent/20 text-fg ring-1 ring-accent/50" : "bg-white/5 text-fg-muted hover:text-fg"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </Overlay>
  );
}
