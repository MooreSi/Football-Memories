import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Film } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ReelSummary } from "../api/types";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";
import { formatClock } from "../lib/format";

export const STATUS: Record<ReelSummary["status"], { label: string; tone: "neutral" | "accent" | "ok" | "danger" | "warn" }> = {
  draft: { label: "Draft", tone: "neutral" },
  queued: { label: "Waiting", tone: "warn" },
  rendering: { label: "Rendering", tone: "accent" },
  done: { label: "Ready", tone: "ok" },
  failed: { label: "Failed", tone: "danger" },
};

export function ReelsPage() {
  const q = useQuery({
    queryKey: ["reels"],
    queryFn: api.reels,
    refetchInterval: (query) => (query.state.data?.some((r) => r.status === "queued" || r.status === "rendering") ? 1500 : false),
  });
  return (
    <>
      <PageHeader eyebrow="Clips" title="Highlight reels">
        <Link to="/clips" className="text-sm text-accent hover:underline">Back to Clip Explorer</Link>
      </PageHeader>
      {q.isPending ? (
        <Spinner />
      ) : !q.data?.length ? (
        <EmptyState icon={Clapperboard} title="No highlight reels yet">
          In the Clip Explorer, queue the moments you love and press <strong>Make highlight reel</strong>.
        </EmptyState>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map((r) => (
            <li key={r.id}>
              <Link to={`/clips/reels/${r.id}`} className="tile group block overflow-hidden hover:ring-1 hover:ring-accent/40">
                <div className="relative aspect-video bg-ink-800">
                  {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="size-full object-cover" /> : <Film className="m-auto mt-16 text-fg-subtle" aria-hidden />}
                  <span className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
                  <span className="absolute top-3 left-3"><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge></span>
                  {(r.status === "rendering" || r.status === "queued") && (
                    <span className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                      <span className="block h-full bg-accent" style={{ width: `${Math.round(r.progress * 100)}%` }} />
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className="text-xs text-fg-muted">
                    {r.item_count} clips · {formatClock(r.output_duration_s ?? r.planned_seconds)}
                    {r.output_height ? ` · ${r.output_height}p` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
