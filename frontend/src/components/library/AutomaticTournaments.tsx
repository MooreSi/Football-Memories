import { useMemo } from "react";
import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HudlMatch } from "../../api/hudl";
import type { VeoMatch } from "../../api/veo";
import { detectTournaments, type TournamentDetectionMatch } from "../../api/tournaments";
import { looksLikePlayer } from "../../lib/hudlPlayer";
import { Button } from "../ui/Button";

/** Reconciles already-cached metadata. Never requests a source refresh, stream or new tags. */
export function AutomaticTournaments({hudl, veo, club, veoClubOf, importedVersion}: {
  hudl?: HudlMatch[]; veo?: VeoMatch[]; club: string | null;
  veoClubOf: (match: VeoMatch) => string | null; importedVersion: number;
}) {
  const client = useQueryClient();
  const pendingIdentity = useIsFetching({queryKey: ["home-club"]}) + useIsFetching({queryKey: ["home-teams"]});
  const hudlMetadata = useMemo(() => (hudl ?? []).map(match => ({
      key: `hudl:${match.id}`, title: match.title, age_group: match.age_group ?? "",
      players: [...new Set((match.moments ?? []).map(moment => moment.category.trim()).filter(looksLikePlayer).map(name => name.toUpperCase()))].sort(),
    })), [hudl]);
  const matches: TournamentDetectionMatch[] = [
    ...hudlMetadata.map(match => ({...match, club: club ?? ""})),
    // Veo highlight labels do not identify players; never treat action names as a roster.
    ...(veo ?? []).map(match => ({key: `veo:${match.id}`, title: match.title, club: veoClubOf(match) ?? "", age_group: match.age_group ?? "", players: []})),
  ].sort((a,b) => a.key.localeCompare(b.key));
  const signature = JSON.stringify(matches);
  const detection = useQuery({
    queryKey: ["automatic-tournaments", signature, importedVersion],
    enabled: pendingIdentity === 0 && (matches.length > 0 || importedVersion > 0),
    staleTime: Infinity,
    retry: false,
    queryFn: async ({signal}) => {
      const data = await detectTournaments(matches, signal);
      await client.cancelQueries({queryKey: ["tournaments"]});
      if (!signal.aborted) client.setQueryData(["tournaments"], data);
      return data;
    },
  });
  if (detection.isFetching) return <p role="status" className="mb-3 text-xs text-fg-muted">Grouping matches from dates, titles and player tags…</p>;
  if (detection.isError) return <p className="mb-3 text-xs text-fg-muted">Automatic grouping could not finish. Saved corrections are kept. <Button onClick={() => void detection.refetch()}>Retry automatic grouping</Button></p>;
  return null;
}
