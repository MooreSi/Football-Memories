import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, FileVideo, ListVideo, TriangleAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { MatchEvent } from "../api/types";
import { EventPanel } from "../components/EventPanel";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { type PlayRequest, VideoPlayer } from "../components/VideoPlayer";
import { DEFAULT_BUFFERS } from "../lib/events";
import { formatBytes, formatClock, formatDate } from "../lib/format";

export function MatchDetailPage() {
  const id = Number(useParams().id);
  const q = useQuery({ queryKey: ["match", id], queryFn: () => api.match(id), enabled: Number.isFinite(id) });
  const [filtered, setFiltered] = useState<MatchEvent[]>([]);
  const [request, setRequest] = useState<PlayRequest | null>(null);
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [momentsOnly, setMomentsOnly] = useState(false);

  const onFilterChange = useCallback((events: MatchEvent[]) => setFiltered(events), []);
  const onSelect = useCallback((event: MatchEvent) => setRequest({ event, nonce: Date.now() }), []);

  if (q.isPending) return <Spinner label="Loading match" />;
  if (q.isError) {
    return (
      <EmptyState icon={TriangleAlert} title="Match not found">
        <Link to="/" className="text-accent hover:underline">
          Back to the library
        </Link>
      </EmptyState>
    );
  }

  const m = q.data;
  const media = m.media;

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft size={15} aria-hidden /> Library
      </Link>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm text-fg-muted">{m.team_name}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            <span className="text-fg-muted">vs</span> {m.opponent}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} aria-hidden /> {formatDate(m.match_date)}
            </span>
            <Badge>{m.season_label}</Badge>
            {m.age_group && <Badge tone="violet">{m.age_group}</Badge>}
            {m.competition && <Badge>{m.competition}</Badge>}
            {m.offline ? <Badge tone="ok">Offline copy</Badge> : <Badge tone="danger">File missing</Badge>}
          </div>
        </div>
        <Button
          variant={momentsOnly ? "subtle" : "primary"}
          onClick={() => setMomentsOnly((x) => !x)}
          disabled={!media?.available || filtered.length === 0}
        >
          <ListVideo size={16} aria-hidden />
          {momentsOnly ? "Watch full match" : `Play ${filtered.length} moments`}
        </Button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {media?.available ? (
            <VideoPlayer
              mediaId={media.id}
              src={media.stream_url}
              poster={media.thumbnail_url}
              fps={media.fps}
              events={filtered}
              buffers={DEFAULT_BUFFERS}
              momentsOnly={momentsOnly}
              onMomentsOnlyChange={setMomentsOnly}
              request={request}
              onActiveEvent={setActiveEventId}
            />
          ) : (
            <EmptyState icon={TriangleAlert} title="The video file is missing">
              The match is still indexed, but its local file could not be found
              {media ? ` (${media.original_filename})` : ""}. Restore the file to the archive folder to play it.
            </EmptyState>
          )}

          {media && (
            <dl className="panel grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
              {[
                ["Duration", formatClock(media.duration_s)],
                ["Resolution", media.width && media.height ? `${media.width} x ${media.height}` : "Unknown"],
                ["Frame rate", media.fps ? `${media.fps.toFixed(2).replace(/\.00$/, "")} fps` : "Unknown"],
                ["Codec", [media.video_codec, media.audio_codec].filter(Boolean).join(" / ") || "Unknown"],
                ["Size", formatBytes(media.size_bytes)],
                ["Source file", media.original_filename],
              ].map(([k, val]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[11px] tracking-wider text-fg-subtle uppercase">{k}</dt>
                  <dd className="truncate" title={val}>
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="flex items-center gap-2 text-xs text-fg-subtle">
            <FileVideo size={13} aria-hidden />
            Keys: space play, arrows 5s, j/l 10s, comma/period frame step, n/p next/previous moment, f full screen, m mute.
            Moments play from {DEFAULT_BUFFERS.pre}s before to {DEFAULT_BUFFERS.post}s after each tag.
          </p>
        </div>

        <EventPanel events={m.events} activeEventId={activeEventId} onSelect={onSelect} onFilterChange={onFilterChange} />
      </div>
    </>
  );
}
