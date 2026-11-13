import { useEffect, useState } from "react";
import { type HudlMatch, hudlAgeGroups } from "../api/hudl";
import { useArchiveFilters } from "./archiveFilters";
import { sameCode } from "./codes";
import { type Team, allSeasons, cohortOf } from "./teams";
import { usePrimaryPlayerName } from "./usePrimaryPlayerName";

const KEY = "fm.opponents.team";
const read = () => { try { const v = localStorage.getItem(KEY); return v && Number.isFinite(Number(v)) ? Number(v) : null; } catch { return null; } };

/** The team (players followed across seasons) chosen on Opponents and reports, kept in
 *  this browser. First time: a link's ?age=&season=, else the Library's age group this
 *  season, else the age group with most matches this season. */
export function useTeamChoice(library: HudlMatch[] | undefined, link?: { age: string | null; season: string | null }) {
  const { age: libraryAge } = useArchiveFilters();
  const { name: player, ready } = usePrimaryPlayerName();
  const [team, setTeam] = useState<Team | null>(() => cohortOf(link?.age ?? "", link?.season ?? undefined) ?? read());
  const latest = allSeasons(library)[0];
  useEffect(() => {
    if (team !== null || !latest || !library || (!libraryAge && !ready)) return;
    const commonest = (only?: (m: HudlMatch) => boolean) => {
      const counts = new Map<string, number>();
      for (const m of library) if (m.season_label === latest && (!only || only(m))) for (const g of hudlAgeGroups(m)) counts.set(g, (counts.get(g) ?? 0) + 1);
      return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    };
    const his = player ? commonest((m) => Boolean(m.moments?.some((t) => sameCode(t.category, player)))) : undefined;
    const pick = cohortOf(libraryAge || his || commonest() || "", latest);
    if (pick !== null) setTeam(pick);
  }, [team, latest, library, libraryAge, player, ready]);
  useEffect(() => { if (team !== null) try { localStorage.setItem(KEY, String(team)); } catch { /* convenience only */ } }, [team]);
  return [team, setTeam] as const;
}
