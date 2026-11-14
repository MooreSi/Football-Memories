import type { HudlMatch } from "../api/hudl";
import type { VeoMatch } from "../api/veo";

/** Owner request 2026-11-14: with Show Hudl off, the Library's hero, latest match and
 *  overview show Veo matches in the shape those panels already read. */
export function veoAsHudl(m: VeoMatch): HudlMatch {
  return {
    id: m.id, source: "veo", title: m.title, age_group: m.age_group, age_groups: m.age_groups, capture_key: m.id,
    season_label: m.season_label, thumbnail_url: m.poster_url ?? null, moments: m.moments ?? [], duration_s: m.duration_s,
    score: m.score ?? null, tag_status: m.moments?.length ? "synced" : "none",
  };
}

/** The match page for a Library match: Veo's own page or the Hudl one. */
export function matchLink(m: Pick<HudlMatch, "id" | "source">): string {
  return `/${m.source === "veo" ? "veo" : "hudl"}/${encodeURIComponent(m.id)}`;
}
