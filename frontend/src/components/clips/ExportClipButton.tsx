import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import type { MomentItem } from "../../api/types";
import { formatClock } from "../../lib/format";

export function ExportClipButton({ moment }: {
  moment: Pick<MomentItem, "event_id" | "category" | "opponent" | "time_s" | "offline">;
}) {
  const navigate = useNavigate();
  const exportClip = useMutation({
    mutationFn: async () => {
      const reel = await api.createReel({
        name: `${moment.category} vs ${moment.opponent} at ${formatClock(moment.time_s)}`.slice(0, 200),
        opening_title: null, closing_text: null,
        items: [{ event_id: moment.event_id, pre_s: null, post_s: null }],
      });
      await api.renderReel(reel.id);
      return reel.id;
    },
    onSuccess: id => navigate(`/clips/reels/${id}`),
  });
  return (
    <div>
      <button type="button" aria-label={`Export ${moment.category} at ${formatClock(moment.time_s)}`}
        disabled={!moment.offline || exportClip.isPending} onClick={() => exportClip.mutate()}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-fg-muted hover:bg-white/5 hover:text-fg disabled:opacity-40">
        <Download size={14} aria-hidden /> {exportClip.isPending ? "Preparing…" : "Export clip"}
      </button>
      {exportClip.isError && <p role="alert" className="text-xs text-danger">{(exportClip.error as Error).message}</p>}
    </div>
  );
}
