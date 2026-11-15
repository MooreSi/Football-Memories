import { useVeoLibrary } from "../api/veo";
import { useVeoTeam } from "./useHomeTeams";
import { veoClubNames, veoClubOf } from "./veoClubs";

type Titled = { title: string; team?: string | null };

/** Owner request 2026-11-15: the club a Veo match is for, when its title names one of
 *  the known clubs first; otherwise the Veo team setting (so "Us" or "Home" when unset). */
export function useVeoClubOf(): (match: Titled | undefined | null) => string | null {
  const library = useVeoLibrary();
  const veoTeam = useVeoTeam();
  const known = veoClubNames(library.data ?? [], veoTeam);
  return (match) => {
    // With no Veo team set, nothing is named (pages keep the title, cards say "Us").
    if (!match || !veoTeam) return veoTeam;
    const named = veoClubOf(match, known);
    return known.includes(named) ? named : veoTeam;
  };
}
