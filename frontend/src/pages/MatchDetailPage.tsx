import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ListVideo, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { MatchDetail, MatchEvent } from "../api/types";
import { MomentList } from "../components/match/MomentList";
import { MomentsRail } from "../components/match/MomentsRail";
import { MomentTimeline } from "../components/match/MomentTimeline";
import { TeamBadge } from "../components/TeamBadge";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { type PlayRequest, type SeekRequest, VideoPlayer } from "../components/VideoPlayer";
import { clipWindow } from "../lib/events";
import { useClipBuffers } from "../lib/useClipBuffers";
import { formatBytes, formatClock, formatDate } from "../lib/format";
import { useMomentFilter } from "../lib/useMomentFilter";

export function MatchDetailPage() {
  const id = Number(useParams().id);
  const q = useQuery({ queryKey: ["match", id], queryFn: () => api.match(id), enabled: Number.isFinite(id) });

  if (q.isPending) return <Spinner label="Loading match" />;
  if (q.isError) {
    return (
      <EmptyState icon={TriangleAlert} title="Match not found">
        <Link to="/" className="text-accent hover:underline">Back to the library</Link>
      </EmptyState>
    );
  }
  return <MatchWorkspace match={q.data} />;
}

/** Layout follows reference 2: tag rail left; header pill, player, clip bar, filter chips and
 *  a full-match moment timeline on the right. */
function MatchWorkspace({ match: m }: { match: MatchDetail }) {
  const [params] = useSearchParams();
  const filter = useMomentFilter(m.events);
  const [request, setRequest] = useState<PlayRequest | null>(null);
  const [seekRequest, setSeekRequest] = useState<SeekRequest | null>(null);
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [momentsOnly, setMomentsOnly] = useState(params.get("moments") === "1");
  const [clock, setClock] = useState({ time: 0, duration: m.media?.duration_s ?? 0 });
  const media = m.media;
  const buffers = useClipBuffers();
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["match", m.id] });
  const favourite = useMutation({
    mutationFn: ({ e, fav }: { e: MatchEvent; fav: boolean }) => api.setFavourite(e.id, fav),
    onSuccess: () => {
      refresh();
      void qc.invalidateQueries({ queryKey: ["player"] });
    },
  });
  const onActiveEvent = useCallback(
    (eventId: number | null) => {
      setActiveEventId(eventId);
      const e = m.events.find((x) => x.id === eventId);
      if (e && !e.viewed) api.markViewed(e.id).then(refresh, () => undefined);
    },
    [m.events, m.id], // refresh only depends on the match id
  );

  const play = useCallback((event: MatchEvent) => setRequest({ event, nonce: Date.now() }), []);
  const onTime = useCallback((time: number, duration: number) => setClock({ time, duration: duration || (m.media?.duration_s ?? 0) }), [m.media]);

  // Deep link from the Library: /matches/7?moment=11 plays that moment.
  useEffect(() => {
    const wanted = Number(params.get("moment"));
    const e = m.events.find((x) => x.id === wanted);
    if (e) play(e);
  }, [params, m.events, play]);

  const active = useMemo(() => m.events.find((e) => e.id === activeEventId) ?? null, [m.events, activeEventId]);
  const clipWin = active ? clipWindow(active, buffers, clock.duration || Number.MAX_SAFE_INTEGER) : null;
  const chips = [
    ...filter.categories.map((c) => ({ key: `c:${c}`, label: c, remove: () => filter.toggleCategory(c) })),
    ...filter.players.map((p) => ({ key: `p:${p}`, label: p, remove: () => filter.togglePlayer(p) })),
  ];

  return (
    <div className="analysis-workspace">
      <div className="analysis-rail min-w-0">
        <MomentsRail match={m} filter={filter} />
      </div>

      <div className="analysis-stage min-w-0 space-y-3">
        {/* Header pill (reference 2 top centre) */}
        <div className="analysis-match-heading flex flex-wrap items-center justify-between gap-3">
          <div className="panel mx-auto flex items-center gap-4 !rounded-full px-4 py-2 xl:mx-0">
            <TeamBadge name={m.team_name} size="sm" />
            <div className="text-center leading-tight">
              <p className="flex items-center justify-center gap-1 text-[11px] text-fg-muted">
                <CalendarDays size={11} aria-hidden /> {formatDate(m.match_date)}
              </p>
              <h1 className="text-sm font-semibold sm:text-base">
                {m.team_name} <span className="px-1 text-fg-muted">vs</span> {m.opponent}
              </h1>
            </div>
            <TeamBadge name={m.opponent} size="sm" tone="away" />
          </div>
          <div className="flex items-center gap-2">
            {m.offline ? <Badge tone="ok">Offline copy</Badge> : <Badge tone="danger">File missing</Badge>}
            <button
              type="button"
              onClick={() => setMomentsOnly((x) => !x)}
              disabled={!media?.available || filter.filtered.length === 0}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-40 ${
                momentsOnly
                  ? "border border-line bg-ink-800 text-fg"
                  : "bg-gradient-to-r from-[#2563eb] to-accent-strong text-white shadow-[0_10px_30px_-10px_rgb(37_99_235/0.9)] hover:brightness-110"
              }`}
            >
              <ListVideo size={16} aria-hidden />
              {momentsOnly ? "Watch full match" : `Play ${filter.filtered.length} moments`}
            </button>
          </div>
        </div>

        {media?.available ? (
          <VideoPlayer
            mediaId={media.id}
            src={media.stream_url}
            poster={media.thumbnail_url}
            fps={media.fps}
            events={filter.filtered}
            buffers={buffers}
            momentsOnly={momentsOnly}
            onMomentsOnlyChange={setMomentsOnly}
            request={request}
            seekRequest={seekRequest}
            onActiveEvent={onActiveEvent}
            onTime={onTime}
          />
        ) : (
          <EmptyState icon={TriangleAlert} title="The video file is missing">
            The match is still indexed, but its local file could not be found
            {media ? ` (${media.original_filename})` : ""}. Restore the file to the archive folder to play it.
          </EmptyState>
        )}

        {/* Clip bar + chips + full-match timeline (reference 2 bottom) */}
        <section aria-label="Moment timeline" className="analysis-timeline panel space-y-3 p-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 font-mono text-xs text-fg-muted">
            <span>{clipWin ? formatClock(clipWin.start) : formatClock(clock.time)}</span>
            <div className="text-center font-sans">
              <p className="text-sm font-semibold text-fg">{active ? active.category : "Full match"}</p>
              <p className="text-[11px] text-fg-subtle">
                {active
                  ? [active.players.join(", "), active.note].filter(Boolean).join(" · ") || `Tagged at ${formatClock(active.time_s)}`
                  : "Pick a pin or a moment to play it"}
              </p>
            </div>
            <span>{clipWin ? formatClock(clipWin.end) : formatClock(clock.duration)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-y border-white/5 py-2">
            {chips.length === 0 ? (
              <span className="text-xs text-fg-subtle">No filters: showing every moment</span>
            ) : (
              chips.map((c) => (
                <button key={c.key} type="button" onClick={c.remove} aria-label={`Remove filter ${c.label}`}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-ink-800 px-2.5 py-1 text-xs hover:border-accent/50">
                  <X size={12} aria-hidden /> {c.label}
                </button>
              ))
            )}
            <span className="ml-auto rounded-full bg-[#2563eb]/80 px-3 py-1 text-xs font-medium text-white">
              {filter.filtered.length} of {m.events.length} moments
            </span>
          </div>

          <MomentTimeline
            events={filter.filtered}
            duration={clock.duration}
            time={clock.time}
            activeEventId={activeEventId}
            onPin={play}
            onSeek={(t) => setSeekRequest({ time: t, nonce: Date.now() })}
          />
        </section>

        {m.events.length === 0 ? (
          <p className="panel !rounded-2xl p-4 text-sm text-fg-muted">
            No tagged moments for this match. Add a <code className="text-fg">.tags.csv</code> file next to the video when importing.
          </p>
        ) : (
          <MomentList events={filter.filtered} activeEventId={activeEventId} onSelect={play} onFavourite={(e, fav) => favourite.mutate({ e, fav })} />
        )}

        {media && (
          <dl className="panel grid grid-cols-2 gap-4 !rounded-2xl p-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
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
                <dd className="truncate" title={val}>{val}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-xs text-fg-subtle">
          Keys: space play, arrows 5s, j/l 10s, comma/period frame step, n/p next/previous moment, f full screen, m mute.
          Moments play from {buffers.pre}s before to {buffers.post}s after each tag (change this in Settings).
        </p>
      </div>
    </div>
  );
}
