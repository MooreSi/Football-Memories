import { useVeoLibrary } from "../api/veo";
import { useVeoTeam } from "./useHomeTeams";
import { veoClubNames, veoClubOf } from "./veoClubs";

type Titled = { title: string; team?: unknown };

/** Owner request 2026-11-15: the club a Veo match is for, when its title names one of
 *  the known clubs first; otherwise the Veo team setting (so "Us" or "Home" when unset). */
/** Owner report 2026-11-20: Library cards and the featured match show crests, so with no
 *  Veo team saved (a library with only shared match links) they still name the club the
 *  match names, rather than "Us", and its crest is looked up. Match pages keep the rule
 *  above. */
export function useVeoCardClubOf(): (match: Titled | undefined | null) => string | null {
  const library = useVeoLibrary();
  const veoTeam = useVeoTeam();
  const named = useVeoClubOf();
  const known = veoClubNames(library.data ?? [], veoTeam);
  return (match) => {
    if (veoTeam || !match) return named(match);
    const club = veoClubOf(match, known);
    return club === "Other" ? null : club;
  };
}

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
