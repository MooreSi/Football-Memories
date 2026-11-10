import { Clapperboard, Download, Film, FolderArchive, HardDriveDownload } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { type DownloadEntry, hudlAgeGroups, useDownloadIndex, useHudlLibrary } from "../api/hudl";
import { TeamBadge } from "../components/TeamBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { formatBytes } from "../lib/format";
import { fixtureDate, fixtureLabel, fixtureParts, ukDate } from "../lib/hudlFixture";
import { useHomeClub } from "../lib/useHomeClub";

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
  const club = useHomeClub();
  const [filter, setFilter] = useState<Filter>("all");
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
      {index.isPending ? <Spinner label="Reading downloads" /> : index.isError ? (
        <EmptyState icon={HardDriveDownload} title="Downloads unavailable">Start the desktop helper to see what has been downloaded.</EmptyState>
      ) : groups.size === 0 ? (
        <EmptyState icon={HardDriveDownload} title="Nothing downloaded yet">
          Download a full match or its moments from a match page or <Link className="text-accent underline" to="/clips">Clips</Link>.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {[...groups].map(([key, list]) => {
            const match = library.data?.find((m) => m.id === key);
            const title = match?.title ?? list[0].title ?? "Downloaded files";
            const age = match ? hudlAgeGroups(match)[0] : "";
            const parts = fixtureParts(title);
            const date = fixtureDate(title);
            const label = fixtureLabel(title, club, age);
            return (
              <article key={key} aria-label={label} className="panel overflow-hidden">
                <div className="flex gap-4 border-b border-line p-4">
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                    {match?.thumbnail_url ? <img crossOrigin="anonymous" src={match.thumbnail_url} alt="" className="size-full object-cover" />
                      : <Film className="m-auto mt-6 text-fg-subtle" aria-hidden />}
                    {parts && <span className="absolute top-1.5 left-1.5 flex gap-1"><TeamBadge name={club || "Home"} size="sm" /><TeamBadge name={parts.opponent} size="sm" tone="away" /></span>}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="font-semibold leading-snug">{label}</h2>
                    <p className="text-xs text-fg-muted">{[date && ukDate(date), age, match?.season_label, parts?.venue].filter(Boolean).join(" · ")}</p>
                    {match && <Link to={`/hudl/${encodeURIComponent(match.id)}`} className="text-xs text-accent hover:underline">Open match</Link>}
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
                        <a href={e.url} aria-label={`Save ${name}`} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm hover:bg-white/10">
                          <Download size={14} aria-hidden /> Save
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
