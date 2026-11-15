import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { HUDL } from "../api/hudl";
import { veoRequest } from "../api/veo";
import { api, type HomeTeams } from "../api/client";

type VeoClub = { names: string[]; crest: boolean };

/** Owner request 2026-11-15: the crest Veo shows for the owner's team (read at Refresh)
 *  becomes the crest of the Veo home team set in Settings, when that team has none.
 *  A crest already there is kept. The names in Veo's match report are not used: on the
 *  real account they were another club's name and the placeholder "Own team". */
export function useVeoClubCrest() {
  const club = useQuery<VeoClub>({ queryKey: ["veo-club"], queryFn: () => veoRequest("/club"), retry: false, staleTime: Infinity });
  const home = useQuery<HomeTeams>({
    queryKey: ["home-teams"], retry: false, enabled: !!club.data?.crest,
    queryFn: api.homeTeams,
  });
  const name = club.data?.crest ? home.data?.veo?.trim() : undefined;
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    void (async () => {
      const have = await fetch(`/api/team-logo?${new URLSearchParams({ name })}`).catch(() => null);
      if (cancelled || have?.status !== 404) return;
      const image = await fetch(`${HUDL}/veo/crest`).then(r => (r.ok ? r.blob() : null)).catch(() => null);
      if (!image || cancelled) return;
      const body = new FormData();
      body.set("name", name);
      body.set("file", new File([image], "crest.png", { type: "image/png" }));
      await fetch("/api/team-logo", { method: "POST", body }).catch(() => null);
    })();
    return () => { cancelled = true; };
  }, [name]);
}
