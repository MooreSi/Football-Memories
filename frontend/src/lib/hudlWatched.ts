/** Hudl moments have no server-side watched state; remember played ones in this browser. */
const KEY = "fm.hudl.watched";

export function watchedHudlMoments(): Set<string> {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "[]");
    return new Set(Array.isArray(data) ? data.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function markHudlMomentWatched(id: string): void {
  try {
    const all = watchedHudlMoments();
    if (all.has(id)) return;
    all.add(id);
    localStorage.setItem(KEY, JSON.stringify([...all].slice(-20000)));
  } catch {
    // Storage may be unavailable (private window); watched state is a convenience.
  }
}
