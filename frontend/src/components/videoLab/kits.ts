import type { AppearanceTrack, Assignment, Observation, Role, Team, TrackLabel } from "./labTypes";

/**
 * Team by shirt colour, moment by moment (spec 660).
 *
 * Tracklets are short and the tracker sometimes swaps one player for another, so a label on a
 * tracklet cannot simply colour the whole tracklet. Instead each sampled detection is matched to
 * the kits you have labelled (worker `colour_lab`: OpenCV Lab, a and b centred on 128) and a short
 * window of neighbouring samples on the same tracklet decides. Only clearly coloured kits decide on
 * their own; black and dark kits (referee, a keeper in black, coats) look alike, so for them your
 * label or the appearance model still decides.
 */
export type KitObservation = Observation & { colour_lab?: number[] | null };
export type KitPrototype = { team: Team | null; role: Role; lab: number[]; examples: number };
export type TeamTimeline = { at: (track_id: number, time_s: number) => Assignment | undefined; tracks: Map<number, Assignment> };

const RADIUS = 20;      // how far a sample may sit from a kit (Lab units, brightness weighted down)
const MARGIN = 6;       // and how much nearer it must be than the next kit
const CHROMA = 15;      // kits less colourful than this (black, grey, white) never decide alone
const WINDOW_S = 1.05;  // neighbouring samples that vote, either side (about three at 3 per second)
const CARRY_S = 2.0;    // an unreadable sample takes the nearest decided one within this time
const MIN_EXAMPLES = 3;

const keyOf = (team: Team | null, role: Role) => `${team}|${role}`;
const chroma = (lab: number[]) => Math.hypot(lab[1] - 128, lab[2] - 128);
const valid = (c: number[] | null | undefined): c is number[] => !!c && c.length === 3 && c.every(Number.isFinite);

export function kitDistance(colour: number[], kit: number[]) {
  const light = chroma(kit) >= CHROMA ? 0.25 : 0.8;
  return Math.hypot(colour[1] - kit[1], colour[2] - kit[2], light * (colour[0] - kit[0]));
}

const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const centre = (points: number[][]) => [0, 1, 2].map(i => median(points.map(p => p[i])));

/** The colour seen most on a set of samples: densest point, then the median of its neighbours. */
function mode(points: number[][]): { lab: number[]; examples: number } | null {
  if (points.length < MIN_EXAMPLES) return null;
  const step = Math.max(1, Math.floor(points.length / 300));
  let best: number[] = points[0], most = -1;
  for (let i = 0; i < points.length; i += step) {
    let n = 0;
    for (const q of points) if (kitDistance(q, points[i]) <= RADIUS) n++;
    if (n > most) { most = n; best = points[i]; }
  }
  let lab = best, near = points;
  for (let k = 0; k < 3; k++) {
    near = points.filter(p => kitDistance(p, lab) <= RADIUS);
    if (near.length < MIN_EXAMPLES) return null;
    lab = centre(near);
  }
  return { lab: lab.map(v => Math.round(v * 10) / 10), examples: near.length };
}

const SECOND_SHADE = 0.2; // a second shade (sun or shadow) needs this share of the label's samples

/**
 * Up to two shades per label you used (team and role), learned from the samples of the people you
 * labelled: low winter sun can wash a shirt out and shadow can turn orange to red. A second shade must
 * be common on its own and must not sit on another label's kit (a tracker swap is not a shade).
 * Kits remembered from earlier matches fill in labels you have not used in this match yet; any label
 * you use here replaces the remembered kit for it (a team can wear an away kit).
 */
export function learnKits(rows: KitObservation[], labels: TrackLabel[], remembered: KitPrototype[] = []): KitPrototype[] {
  const label = new Map(labels.map(l => [l.track_id, l]));
  const samples = new Map<string, { team: Team | null; role: Role; points: number[][] }>();
  for (const row of rows) {
    const l = label.get(row.track_id);
    if (!l || !valid(row.colour_lab)) continue;
    const key = keyOf(l.team, l.role);
    const bucket = samples.get(key) ?? { team: l.team, role: l.role, points: [] };
    bucket.points.push(row.colour_lab);
    samples.set(key, bucket);
  }
  const learned: KitPrototype[] = [];
  for (const { team, role, points } of samples.values()) {
    const found = mode(points);
    if (found) learned.push({ team, role, ...found });
  }
  const firsts = [...learned];
  for (const { team, role, points } of samples.values()) {
    const first = firsts.find(k => k.team === team && k.role === role);
    if (!first) continue;
    const rest = points.filter(p => kitDistance(p, first.lab) > RADIUS);
    if (rest.length < Math.max(MIN_EXAMPLES, points.length * SECOND_SHADE)) continue;
    const found = mode(rest);
    if (!found || found.examples < points.length * SECOND_SHADE) continue;
    if (firsts.some(k => (k.team !== team || k.role !== role) && kitDistance(found.lab, k.lab) <= RADIUS + MARGIN)) continue;
    learned.push({ team, role, ...found });
  }
  const here = new Set(labels.map(l => keyOf(l.team, l.role)));
  return [...learned, ...remembered.filter(k => !here.has(keyOf(k.team, k.role)) && valid(k.lab))];
}

const sameKit = (a: KitPrototype, b: KitPrototype) => a.team === b.team && a.role === b.role;

/** The decisive kit a sample matches, if one is clearly nearer than any other label's kit. */
function match(colour: number[] | null | undefined, kits: KitPrototype[]): KitPrototype | null {
  if (!valid(colour)) return null;
  let first: KitPrototype | null = null, d1 = Infinity;
  for (const kit of kits) { const d = kitDistance(colour, kit.lab); if (d < d1) { d1 = d; first = kit; } }
  if (!first || d1 > RADIUS || chroma(first.lab) < CHROMA) return null;
  let d2 = Infinity;
  for (const kit of kits) if (!sameKit(kit, first)) d2 = Math.min(d2, kitDistance(colour, kit.lab));
  return d2 - d1 >= MARGIN ? first : null;
}

/**
 * Does this colour show a different known kit from `label`'s own? (The tracker moved from a labelled
 * player onto someone else, often the referee in black.) Only a colourful label kit can be contradicted.
 */
function contradicts(colour: number[] | null | undefined, own: KitPrototype | KitPrototype[] | undefined, kits: KitPrototype[]) {
  const shades = own === undefined ? [] : Array.isArray(own) ? own : kits.filter(k => sameKit(k, own));
  if (!shades.length || !valid(colour) || !shades.some(k => chroma(k.lab) >= CHROMA) || shades.some(k => kitDistance(colour, k.lab) <= 2 * RADIUS)) return false;
  return kits.some(k => !shades.includes(k) && kitDistance(colour, k.lab) <= RADIUS);
}

/**
 * Appearance views prepared for the appearance model, which now only has to settle what colour cannot
 * (dark kits: referee, a keeper in black, coats). Labelled people lose views showing another known kit,
 * so a tracker swap cannot teach the wrong label; unlabelled people lose views in a clear team kit,
 * because those moments are decided by kit and would otherwise outvote their dark views.
 */
export function cleanAnchors(tracks: AppearanceTrack[], labels: TrackLabel[], kits: KitPrototype[]): AppearanceTrack[] {
  const label = new Map(labels.map(l => [l.track_id, l]));
  const decisive = kits.filter(k => chroma(k.lab) >= CHROMA);
  const swaps: AppearanceTrack[] = [];
  const prepared = tracks.map(track => {
    if (!track.views?.length) return track;
    const l = label.get(track.track_id);
    const own = l ? kits.filter(k => k.team === l.team && k.role === l.role) : [];
    if (l) {
      // The stretch after a tracker swap is judged separately, as track -id, never with your label.
      const swapped = track.views.filter(v => contradicts(v.kit, own, kits));
      if (swapped.length) swaps.push({ ...track, track_id: -track.track_id, views: swapped.filter(v => !match(v.kit, decisive)).length ? swapped.filter(v => !match(v.kit, decisive)) : swapped });
    }
    const views = l ? track.views.filter(v => !contradicts(v.kit, own, kits)) : track.views.filter(v => !match(v.kit, decisive));
    return views.length === track.views.length || !views.length ? track : { ...track, views };
  });
  return [...prepared, ...swaps];
}

const assignment = (kit: KitPrototype, source: Assignment["source"], confidence: number): Assignment => ({ team: kit.team, role: kit.role, source, confidence });

/**
 * Team and role for every sampled detection. Order of evidence: a clear kit nearby on the same
 * tracklet; then your label for the tracklet; then `fallback` (the appearance model). A label you gave
 * yields to the kit only where the kit belongs to a different labelled team or role than yours, or
 * where your label is a dark kit (referee, keeper in black) and the tracklet mostly shows a team kit.
 */
export function kitTimeline(rows: KitObservation[], kits: KitPrototype[], labels: TrackLabel[], fallback: Map<number, Assignment>): TeamTimeline {
  const decisive = kits.filter(k => chroma(k.lab) >= CHROMA);
  const canon = new Map<string, KitPrototype>();
  for (const k of kits) if (!canon.has(keyOf(k.team, k.role))) canon.set(keyOf(k.team, k.role), k);
  const label = new Map(labels.map(l => [l.track_id, l]));
  const byTrack = new Map<number, KitObservation[]>();
  for (const row of rows) { const list = byTrack.get(row.track_id) ?? []; list.push(row); byTrack.set(row.track_id, list); }
  const timelines = new Map<number, { times: number[]; values: (Assignment | undefined)[] }>();
  const tracks = new Map<number, Assignment>();
  for (const [track, list] of byTrack) {
    list.sort((a, b) => a.time_s - b.time_s);
    // Shades of one kit vote as that kit.
    const matched = list.map(r => { const m = match(r.colour_lab, decisive); return m && canon.get(keyOf(m.team, m.role))!; });
    // A short window of samples votes, so one odd frame cannot flip a player.
    const decided: ({ kit: KitPrototype; share: number } | null)[] = list.map((r, i) => {
      const votes = new Map<KitPrototype, number>();
      let total = 0, inWindow = 0;
      for (let j = i; j >= 0 && r.time_s - list[j].time_s <= WINDOW_S; j--) { inWindow++; const m = matched[j]; if (m) { votes.set(m, (votes.get(m) ?? 0) + 1); total++; } }
      for (let j = i + 1; j < list.length && list[j].time_s - r.time_s <= WINDOW_S; j++) { inWindow++; const m = matched[j]; if (m) { votes.set(m, (votes.get(m) ?? 0) + 1); total++; } }
      const top = [...votes].sort((a, b) => b[1] - a[1])[0];
      return top && top[1] >= Math.min(2, inWindow) && top[1] / total >= 0.6 ? { kit: top[0], share: top[1] / total } : null;
    });
    // An unreadable sample (bending over, crossing someone) keeps the nearest decided kit.
    const filled = decided.map((d, i) => {
      if (d) return d;
      let best: { kit: KitPrototype; share: number } | null = null, gap = Infinity;
      for (let j = 0; j < list.length; j++) {
        const g = Math.abs(list[j].time_s - list[i].time_s);
        if (decided[j] && g <= CARRY_S && g < gap) { gap = g; best = decided[j]; }
      }
      // ...unless this sample plainly shows another known kit (the tracker moved onto someone else).
      return best && !contradicts(list[i].colour_lab, kits.filter(k => sameKit(k, best!.kit)), kits) ? best : null;
    });
    const counts = new Map<KitPrototype, number>();
    for (const f of filled) if (f) counts.set(f.kit, (counts.get(f.kit) ?? 0) + 1);
    const mine = label.get(track);
    const ownKit = mine ? kits.filter(k => k.team === mine.team && k.role === mine.role) : [];
    const ownKitDecides = ownKit.some(k => chroma(k.lab) >= CHROMA);
    const values = filled.map((f, i) => {
      if (!f) {
        if (!mine) return fallback.get(track);
        if (!contradicts(list[i].colour_lab, ownKit, kits)) return { team: mine.team, role: mine.role, source: "you" as const, confidence: 1 };
        const other = fallback.get(-track) ?? fallback.get(track);
        return other?.source === "you" ? undefined : other;
      }
      if (!mine) return assignment(f.kit, "kit", f.share);
      if (f.kit.team === mine.team && f.kit.role === mine.role) return assignment(f.kit, "you", 1);
      // Your label disagrees with the kit here: a tracker swap, unless your label is itself a dark kit
      // and this colour is only a passing minority of the tracklet.
      const minority = (counts.get(f.kit) ?? 0) < list.length / 2;
      return ownKitDecides || !minority ? assignment(f.kit, "kit", f.share) : { team: mine.team, role: mine.role, source: "you" as const, confidence: 1 };
    });
    timelines.set(track, { times: list.map(r => r.time_s), values });
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    tracks.set(track, mine ? { team: mine.team, role: mine.role, source: "you", confidence: 1 }
      : top && top[1] >= list.length / 2 ? assignment(top[0], "kit", top[1] / list.length)
      : fallback.get(track) ?? { team: null, role: null, source: "none", confidence: 0 });
  }
  // One referee and one keeper per team on the pitch: at each moment your label wins, then a kit
  // match, then the strongest look-alike; other people suggested for that role stay unassigned.
  const unique = (a?: Assignment) => a && a.source !== "none" && (a.role === "referee" || a.role === "goalkeeper") ? `${a.role}|${a.team}` : null;
  const rank = (a: Assignment) => (a.source === "you" ? 2 : a.source === "kit" ? 1 : 0) + a.confidence / 10;
  const moments = new Map<string, { values: (Assignment | undefined)[]; i: number }[]>();
  for (const line of timelines.values()) line.times.forEach((t, i) => {
    const key = unique(line.values[i]);
    if (!key) return;
    const slot = `${t}|${key}`, list = moments.get(slot) ?? [];
    list.push({ values: line.values, i }); moments.set(slot, list);
  });
  for (const list of moments.values()) {
    if (list.length < 2) continue;
    const best = list.reduce((a, b) => rank(b.values[b.i]!) > rank(a.values[a.i]!) ? b : a);
    for (const entry of list) if (entry !== best && entry.values[entry.i]!.source !== "you") entry.values[entry.i] = undefined;
  }
  for (const [track, value] of fallback) if (track >= 0 && !tracks.has(track)) tracks.set(track, value);
  const at = (track_id: number, time_s: number) => {
    const line = timelines.get(track_id);
    if (!line) return fallback.get(track_id);
    let lo = 0, hi = line.times.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (line.times[mid] <= time_s) lo = mid; else hi = mid - 1; }
    const i = lo + 1 < line.times.length && line.times[lo + 1] - time_s < time_s - line.times[lo] ? lo + 1 : lo;
    return line.values[i];
  };
  return { at, tracks };
}

/** A saved human-only learned model of another run (gateway `review/learned-model`), with its match title. */
export type SavedModel = { title: string; examples: { team: Team | null; role: Role; views?: { kit?: number[] | null }[] }[] };

// "261107 RCW vs Kidderminster CG", "Racing Club Warwick vs Kidderminster RMC · 16 Nov 2026 · 18:00–28:00"
const clubs = (title: string) => title.split("·")[0].replace(/^\s*\d+\s+/, "").split(/\s+vs\.?\s+/i).map(c => c.trim().toLowerCase()).filter(Boolean);
const initials = (club: string) => club.split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, "")[0] ?? "").join("");
/** The same club, written in full or as its initials (RCW = Racing Club Warwick). */
const sameClub = (a: string, b: string) => a === b || (!a.includes(" ") && a.length >= 2 && initials(b) === a) || (!b.includes(" ") && b.length >= 2 && initials(a) === b);

/**
 * Kits taught in your other runs. Another window of the same match brings back every kit; another
 * match sharing a club name in its title brings back only your team's kits (opponents change). Kits
 * from runs you have not titled are never reused. Learned here, they are replaced by any label here.
 */
export function rememberKits(models: SavedModel[], title: string): KitPrototype[] {
  const here = clubs(title);
  if (!here.length) return [];
  const samples = new Map<string, { team: Team | null; role: Role; points: number[][] }>();
  for (const model of models) {
    const same = model.title.trim() !== "" && model.title.trim() === title.trim();
    if (!same && !clubs(model.title).some(c => here.some(h => sameClub(c, h)))) continue;
    for (const example of model.examples) {
      if (!same && example.team !== "own") continue;
      const key = keyOf(example.team, example.role);
      const bucket = samples.get(key) ?? { team: example.team, role: example.role, points: [] };
      for (const view of example.views ?? []) if (valid(view.kit)) bucket.points.push(view.kit);
      samples.set(key, bucket);
    }
  }
  const out: KitPrototype[] = [];
  for (const { team, role, points } of samples.values()) { const found = mode(points); if (found) out.push({ team, role, ...found }); }
  return out;
}

/** Hex colour of a worker Lab colour (OpenCV 8-bit Lab, D65), for kit swatches. */
export function kitColour(lab: number[]): string {
  const L = lab[0] * 100 / 255, a = lab[1] - 128, b = lab[2] - 128;
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t: number) => t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const [x, y, z] = [0.95047 * inv(fx), inv(fy), 1.08883 * inv(fz)];
  const lin = [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.204 * y + 1.057 * z];
  return "#" + lin.map(c => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0"); }).join("");
}
