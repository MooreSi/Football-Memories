import { Clapperboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoalEntries } from "../../lib/goals";
import { reelPresets } from "../../lib/reelPresets";
import { usePrimaryPlayerName } from "../../lib/usePrimaryPlayerName";
import { Button } from "../ui/Button";

type Match = Parameters<typeof reelPresets>[0] & { id: string; tag_status?: string; available?: boolean };

/** Spec 300: one-click reels for this match; each opens Reel Studio with its moments. */
export function QuickReels({ match, club }: { match: Match; club: string | null }) {
  const navigate = useNavigate();
  const entries = useGoalEntries();
  const player = usePrimaryPlayerName();
  const isVeo = match.source === "veo";
  if (isVeo ? !match.available : match.tag_status === "unsynced") return null;
  if (entries.isPending || !player.ready) return null;
  const presets = reelPresets(match, club, isVeo ? null : player.name, entries.data?.[match.id]);
  if (!presets.length) return null;
  return <section aria-label="Quick reels" className="panel flex flex-wrap items-center gap-2 p-4">
    <p className="mr-2 flex items-center gap-2 text-sm font-semibold"><Clapperboard size={16} className="text-accent" aria-hidden /> Quick reels</p>
    {presets.map((p) => (
      <Button key={p.id} variant="subtle" onClick={() => navigate("/clips/reel/new", { state: {
        ...(isVeo ? { source: "veo" } : {}), name: p.name, items: [{ match_id: match.id, moment_ids: p.momentIds }] } })}>
        {p.label} ({p.momentIds.length})
      </Button>
    ))}
  </section>;
}
