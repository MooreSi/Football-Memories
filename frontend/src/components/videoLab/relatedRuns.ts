type Run = { id: string; match_title?: string; sample_id?: string };

/** A run's match title; a derived run (shirt numbers, grouping) has none of its own, so it takes its source run's. */
export function matchTitle(run: Run, others: Run[]): string | undefined {
  return run.match_title || others.find(o => o.match_title && o.sample_id && o.sample_id === run.sample_id)?.match_title;
}

/**
 * The runs whose labels may teach this one its kits: runs of the same match first, then the most recent
 * others. A full match is analysed in many windows, so the most recent runs are often other matches
 * (overnight 26 November 2026: 21 runs over three matches).
 */
export function relatedRuns(title: string | undefined, others: Run[], limit = 6): { id: string; match_title: string }[] {
  const titled = others.map(o => ({ id: o.id, match_title: matchTitle(o, others) ?? "" })).filter(o => o.match_title);
  const same = titled.filter(o => title && o.match_title.trim() === title.trim());
  return [...same, ...titled.filter(o => !same.includes(o))].slice(0, limit);
}
