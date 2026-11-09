import { useMemo, useState } from "react";
import type { MatchEvent } from "../api/types";
import { type FilterMode, filterEvents } from "./events";

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function useMomentFilter(events: MatchEvent[]) {
  const [categories, setCategories] = useState<string[]>([]);
  const [players, setPlayers] = useState<string[]>([]);
  const [mode, setMode] = useState<FilterMode>("or");
  const filtered = useMemo(() => filterEvents(events, { categories, players, mode }), [events, categories, players, mode]);
  return {
    categories, players, mode, filtered, setMode,
    toggleCategory: (c: string) => setCategories((l) => toggle(l, c)),
    togglePlayer: (p: string) => setPlayers((l) => toggle(l, p)),
    clear: () => {
      setCategories([]);
      setPlayers([]);
    },
  };
}

export type MomentFilter = ReturnType<typeof useMomentFilter>;
