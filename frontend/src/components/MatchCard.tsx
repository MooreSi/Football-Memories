import { CalendarDays, HardDriveDownload, ImageOff, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { MatchSummary } from "../api/types";
import { formatClock, formatDate } from "../lib/format";
import { Badge } from "./ui/Badge";

export function MatchCard({ match }: { match: MatchSummary }) {
  const title = `${match.team_name} vs ${match.opponent}`;
  return (
    <Link
      to={`/matches/${match.id}`}
      aria-label={title}
      className="group tile overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] focus-visible:shadow-[var(--shadow-glow)]"
    >
      <div className="relative aspect-video overflow-hidden bg-ink-800">
        {match.thumbnail_url ? (
          <img
            src={match.thumbnail_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-fg-subtle">
            <ImageOff aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-transparent" />
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 rounded-full bg-ink-950/75 p-0.5 backdrop-blur-sm">
          {match.age_group && <Badge tone="violet">{match.age_group}</Badge>}
          {match.offline && (
            <Badge tone="ok">
              <HardDriveDownload size={11} aria-hidden />
              Offline
            </Badge>
          )}
        </div>
        {match.duration_s != null && (
          <span className="absolute right-2.5 bottom-2.5 rounded-md bg-ink-950/80 px-1.5 py-0.5 font-mono text-[11px] text-fg">
            {formatClock(match.duration_s)}
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <p className="text-xs text-fg-subtle">{match.team_name}</p>
        <h3 className="text-base leading-snug font-semibold">
          <span className="text-fg-muted">vs</span> {match.opponent}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={13} aria-hidden />
            {formatDate(match.match_date)}
          </span>
          <span>{match.season_label}</span>
          {match.competition && <span>{match.competition}</span>}
        </div>
        <div className="flex items-center gap-1.5 pt-1 text-xs">
          <Sparkles size={13} className="text-accent" aria-hidden />
          <span>{match.event_count === 1 ? "1 moment" : `${match.event_count} moments`}</span>
        </div>
      </div>
    </Link>
  );
}
