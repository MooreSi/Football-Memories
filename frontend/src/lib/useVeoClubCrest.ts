import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { HUDL } from "../api/hudl";
import { veoRequest } from "../api/veo";

type VeoClub = { names: string[]; crest: boolean };

/** Owner request 2026-11-15: the club's crest from Veo (read at Refresh) becomes the
 *  app's crest for each of the club's names that has none. A crest the app already
 *  has (found on the web or added by the owner) is never replaced. */
export function useVeoClubCrest() {
  const club = useQuery<VeoClub>({ queryKey: ["veo-club"], queryFn: () => veoRequest("/club"), retry: false, staleTime: Infinity });
  useEffect(() => {
    const names = club.data?.crest ? club.data.names : [];
    if (!names.length) return;
    let cancelled = false;
    void (async () => {
      let image: Blob | null = null;
      for (const name of names) {
        const have = await fetch(`/api/team-logo?${new URLSearchParams({ name })}`).catch(() => null);
        if (cancelled) return;
        if (have?.status !== 404) continue;
        image ??= await fetch(`${HUDL}/veo/crest`).then(r => (r.ok ? r.blob() : null)).catch(() => null);
        if (!image || cancelled) return;
        const body = new FormData();
        body.set("name", name);
        body.set("file", new File([image], "crest.png", { type: "image/png" }));
        await fetch("/api/team-logo", { method: "POST", body }).catch(() => null);
      }
    })();
    return () => { cancelled = true; };
  }, [club.data]);
}
