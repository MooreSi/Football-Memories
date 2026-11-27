// Score the Video Lab's pitch analytics tags against Hudl's tags (or Veo's) on the same footage.
// Read-only: reads one finished run's folder and one tag file, prints a report, writes nothing.
//
//   node scripts/score-analytics-tags.mjs <job folder> --hudl <match detail json> --club "<club>"
//        [--offset <s>] [--title "<match title>"] [--from <s>] [--to <s>] [--tolerance <s>]
//        [--params '<json>'] [--sweep] [--json]
//   node scripts/score-analytics-tags.mjs <job folder> --veo [...]   (the run's own veo_tags.json)
//
// <job folder> is the worker's runtime/jobs/<id> (result/ plus review.json). The Hudl file is the
// helper's cached match detail ({ moments: [{ time_s, duration_s, category }] }); --offset is where
// the analysed window starts in the Hudl video (the sample's source_offset_s). --from/--to limit
// scoring to part of the window (run seconds), so parameters can be tuned on one part and checked
// on a withheld part. Uses the page's own functions (decisions.ts), loaded through Vite.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const job = args[0] && !args[0].startsWith("--") ? resolve(args[0]) : null;
if (!job || (!flag("--hudl") && !args.includes("--veo"))) {
  console.error("usage: node scripts/score-analytics-tags.mjs <job folder> (--hudl <detail.json> --club <club> | --veo) [--offset s] [--title t] [--from s] [--to s] [--tolerance s] [--params json] [--sweep] [--json]");
  process.exit(2);
}
const result = join(job, "result");
const json = name => (existsSync(join(result, name)) ? JSON.parse(readFileSync(join(result, name), "utf8")) : undefined);
const from = Number(flag("--from") ?? 0), to = Number(flag("--to") ?? Infinity), tolerance = Number(flag("--tolerance") ?? 4);
const offset = Number(flag("--offset") ?? 0);
// --any-team scores type and time only, to tell team errors from timing errors (diagnosis only).
const anyTeam = args.includes("--any-team");

/** Hudl stems (after the team prefix) onto analytics tag types. */
const STEMS = {
  "POSSESSION": "possession", "CONTESTED POSSESSION": "contested_possession", "BALL OUT OF PLAY": "ball_out_of_play",
  "THROW": "throw", "THROW IN": "throw", "GOAL KICK": "goal_kick", "CORNER": "corner",
  "FREE KICK": "free_kick", "ATTACKING FREE KICK": "free_kick", "DEFENSIVE FREE KICK": "free_kick",
  "DEFENSIVE THIRD ENTRY": "defensive_third_entry", "MIDFIELD THIRD ENTRY": "midfield_third_entry",
  "ATTACKING THIRD ENTRY": "attacking_third_entry", "PENALTY AREA ENTRY": "penalty_area_entry",
  "GOAL": "goal", "CROSS": "cross", "CHANCE": "chance", "ON TARGET": "on_target", "SHOT ON TARGET": "on_target",
  "PASS": "pass", "PASSES": "pass", "PASSING": "pass", "PASS COMPLETED": "pass", "SUCCESSFUL PASS": "pass",
};
/** Veo event types onto analytics tag types (Veo tags only some of them). */
const VEO = { corner: "corner", free_kick: "free_kick", goal_kick: "goal_kick", throw_in: "throw", shot: "chance", goal: "goal", pass: "pass", cross: "cross", out_of_play: "ball_out_of_play" };

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const d = await server.ssrLoadModule("/src/components/videoLab/decisions.ts");
  const { mergeDense } = await server.ssrLoadModule("/src/components/videoLab/playArea.ts");
  const { codeSides } = await server.ssrLoadModule("/src/lib/matchProfile.ts");
  const { DEFAULT_PARAMS } = await server.ssrLoadModule("/src/components/videoLab/analyticsTags.ts");

  // The run, exactly as the page builds it.
  const review = existsSync(join(job, "review.json")) ? JSON.parse(readFileSync(join(job, "review.json"), "utf8")) : null;
  const summary = json("summary.json"), assignments = json("team_assignments.json"), dense = json("dense_tracks.json");
  const atlas = existsSync(join(result, "pitch_atlas.json")) && existsSync(join(result, "pitch_atlas.jpg"));
  const title = flag("--title") ?? (existsSync(join(job, "request.json")) ? JSON.parse(readFileSync(join(job, "request.json"), "utf8")).match_title : undefined);
  const panorama = d.labPanorama(json(atlas ? "pitch_atlas.json" : "pitch_panorama.json"), assignments.observations, title, review?.pitch_size);
  const camera = d.labCamera(json("camera_motion.json"), panorama, review, summary?.source_sha256);
  const automaticBoundaries = d.automaticBoundariesFor(json("camera_motion.json"), summary?.source_sha256);
  const inputs = { assignments, dense, appearance: json("track_appearance.json"), review, camera, automaticBoundaries, remembered: [] };
  const rows = d.labRows(assignments, dense);
  const kits = d.labKits(rows, review, []);
  const timeline = d.labTimeline(inputs, rows, kits, d.labOffPitch(inputs));
  const detections = existsSync(join(result, "detections.jsonl")) ? readFileSync(join(result, "detections.jsonl"), "utf8") : undefined;
  const ball = d.labBall(dense, detections, assignments, camera);
  const peopleDense = dense?.balls ? undefined : dense;
  const base = { rows: mergeDense(assignments.observations, peopleDense), camera, marks: review?.pitch_keyframes ?? [], size: review?.pitch_size, ball, frame: { w: assignments.image_width, h: assignments.image_height }, timeline };

  // The reference tags, in run seconds.
  let reference = [];
  if (flag("--hudl")) {
    const moments = JSON.parse(readFileSync(resolve(flag("--hudl")), "utf8")).moments ?? [];
    const place = codeSides(moments, flag("--club") ?? null);
    for (const m of moments) {
      const p = place(String(m.category).replaceAll("&amp;", "&"));
      const type = STEMS[p.stem];
      if (!type) continue;
      const team = p.side === "ours" ? "own" : p.side === "theirs" ? "opponent" : null;
      reference.push({ type, team, time_s: m.time_s - offset, end_s: m.time_s - offset + Math.max(0, m.duration_s ?? 0), code: m.category });
    }
  } else {
    const veo = json("veo_tags.json");
    for (const e of veo?.events ?? []) { const type = VEO[e.type]; if (type) reference.push({ type, team: e.side === "own" || e.side === "opponent" ? e.side : null, time_s: e.time_s, end_s: e.time_s, code: e.type }); }
  }
  const duration = summary?.duration_s ?? Math.max(0, ...assignments.observations.map(o => o.time_s));
  const lo = Math.max(0, from), hi = Math.min(to, duration);
  reference = reference.filter(r => r.time_s >= lo && r.time_s < hi);
  // Hudl gives a possession its team only; contested and out of play are neutral spans.
  const NEUTRAL = new Set(["contested_possession", "ball_out_of_play"]);
  // Hudl's event tags are fixed-length clips with a lead-in (every throw clip starts 5.0 s before
  // the ball comes back on Stoke), so those match when our tag falls inside the clip. Spans
  // (possession, third entries, out of play) start at the event, so those match on start time.
  const SPANS = new Set(["possession", "contested_possession", "ball_out_of_play", "defensive_third_entry", "midfield_third_entry", "attacking_third_entry"]);
  const near = (r, t) => SPANS.has(r.type) || r.end_s <= r.time_s ? Math.abs(t.time_s - r.time_s) <= tolerance : t.time_s >= r.time_s - tolerance && t.time_s <= r.end_s;

  function score(params) {
    const tags = d.labAnalytics({ ...base, params }).filter(t => t.time_s >= lo && t.time_s < hi);
    const types = [...new Set([...reference.map(r => r.type)])].sort();
    const perType = [];
    let tp = 0, fp = 0, fn = 0;
    for (const type of types) {
      const ref = reference.filter(r => r.type === type), ours = tags.filter(t => t.type === type);
      const used = new Set();
      let hit = 0;
      for (const r of ref) {
        const match = ours.findIndex((t, i) => !used.has(i) && (NEUTRAL.has(type) || anyTeam || t.team === r.team) && near(r, t));
        if (match >= 0) { used.add(match); hit++; }
      }
      perType.push({ type, hudl: ref.length, ours: ours.length, matched: hit, precision: ours.length ? hit / ours.length : null, recall: ref.length ? hit / ref.length : null });
      tp += hit; fp += ours.length - hit; fn += ref.length - hit;
    }
    // Possession, second by second (half-second ticks): does our team on the ball agree with Hudl's?
    const stateAt = (list, t) => list.find(x => x.type === "possession" && t >= x.time_s && t < x.end_s)?.team ?? null;
    const outAt = (list, t) => list.some(x => x.type === "ball_out_of_play" && t >= x.time_s && t < x.end_s);
    let both = 0, agree = 0, hudlTeam = 0, oursTeam = 0, outBoth = 0, outEither = 0;
    for (let t = lo; t < hi; t += 0.5) {
      const h = stateAt(reference, t), a = stateAt(tags, t);
      if (h) hudlTeam++;
      if (h && a) { both++; oursTeam++; if (h === a) agree++; }
      const ho = outAt(reference, t), ao = outAt(tags, t);
      if (ho || ao) outEither++;
      if (ho && ao) outBoth++;
    }
    const precision = tp + fp ? tp / (tp + fp) : 0, recall = tp + fn ? tp / (tp + fn) : 0;
    return {
      window: [lo, hi], tolerance_s: tolerance, reference: reference.length, tags: tags.length,
      overall: { precision, recall, f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0 },
      possession: { agreement: both ? agree / both : null, coverage: hudlTeam ? oursTeam / hudlTeam : null, ticks: both },
      out_of_play_overlap: outEither ? outBoth / outEither : null,
      per_type: perType, tags_by_type: Object.fromEntries([...new Set(tags.map(t => t.type))].map(k => [k, tags.filter(t => t.type === k).length])),
    };
  }
  if (args.includes("--direction")) {
    const lp = await server.ssrLoadModule("/src/components/videoLab/livePitch.ts");
    const { attackDirection } = await server.ssrLoadModule("/src/components/videoLab/analyticsTags.ts");
    const drawn = base.size ?? d.ASSUMED_PITCH, source = lp.pitchSource(camera, base.marks, drawn);
    const paths = lp.trackPaths(base.rows, source), teamAt = (k, t) => timeline.at(k, t) ?? timeline.tracks.get(k);
    const keepers = { own: [], opponent: [] };
    for (const [k, path] of paths) for (const q of path) { const a = teamAt(k, q.time_s); if (a?.team && a.role === "goalkeeper") keepers[a.team].push(q.x); }
    const med = v => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(1) : "-";
    console.log(`attack direction ${attackDirection(paths, teamAt, drawn)} (our team towards x = ${attackDirection(paths, teamAt, drawn) > 0 ? "length" : "0"}); keeper x median own ${med(keepers.own)} (${keepers.own.length}) opponent ${med(keepers.opponent)} (${keepers.opponent.length})`);
  }
  const objective = r => r.overall.f1 + 0.5 * (r.possession.agreement ?? 0) * (r.possession.coverage ?? 0) + 0.25 * (r.out_of_play_overlap ?? 0);
  const fixed = flag("--params") ? JSON.parse(flag("--params")) : {};
  if (args.includes("--sweep")) {
    // Coordinate search: one parameter at a time over a small grid, keeping any improvement.
    const grid = {
      reach_m: [1.5, 2, 2.5, 3, 3.5, 4, 5], contest_margin_m: [0, 0.4, 0.8, 1.2], confirm_checks: [1, 2, 3, 4],
      min_possession_s: [0.5, 1, 2, 3], out_margin_m: [0, 0.5, 1, 2, 3], out_samples: [1, 2, 3],
      pass_min_m: [3, 5, 8], shot_speed_ms: [5, 8, 12], shot_reach: [0.12, 0.18, 0.25, 0.33],
      entry_hold_s: [0, 0.6, 1.5, 3], ball_hold_s: [0.2, 0.5, 1, 1.5], min_contested_s: [0.5, 1, 2, 3],
      slow_ms: [0.8, 1, 1.1, 1.3, 1.5], slow_s: [0, 2, 3, 4, 6], slow_lead_s: [0, 1, 2, 3], slow_gap_s: [0.5, 1, 2], ball_play_ms: [2, 3, 5, 8],
      touch_m: [3, 5, 7, 9], corner_m: [5, 8, 12], goal_area: [0.08, 0.12, 0.18, 0.25], goal_width: [0.2, 0.3, 0.4], restart_look_s: [1, 3, 5], restart_reach_m: [3, 4, 6, 10], held_touch_m: [3, 6, 10, 15], restart_after_s: [0, 1.5, 3], centre_m: [3, 5, 8], throw_gap_s: [4, 8, 15],
    };
    let best = { ...fixed }, bestScore = objective(score(best));
    for (let round = 0; round < 2; round++) for (const [key, values] of Object.entries(grid)) for (const v of values) {
      const trial = { ...best, [key]: v }, s = objective(score(trial));
      if (s > bestScore + 1e-9) { best = trial; bestScore = s; }
    }
    console.log(JSON.stringify({ best, objective: bestScore, defaults: DEFAULT_PARAMS, report: score(best) }, null, args.includes("--json") ? 0 : 1));
  } else {
    const report = score(fixed);
    if (args.includes("--timeline")) {
      const tags = d.labAnalytics({ ...base, params: fixed }).filter(t => t.time_s >= lo && t.time_s < hi && t.type !== "pass");
      for (const x of [...reference.map(r => ({ ...r, who: "HUDL" })), ...tags.map(t => ({ ...t, who: "ours" }))].sort((a, b) => a.time_s - b.time_s))
        console.log(`${x.time_s.toFixed(1).padStart(6)}-${x.end_s.toFixed(1).padStart(6)} ${x.who.padEnd(5)} ${x.type.padEnd(24)} ${(x.team ?? "-").padEnd(9)} ${x.evidence ?? x.code ?? ""}`);
    }
    if (args.includes("--json")) console.log(JSON.stringify(report));
    else {
      console.log(`window ${report.window[0]}-${report.window[1]} s, tolerance ${tolerance} s, ${report.reference} reference tags, ${report.tags} analytics tags`);
      console.log(`overall precision ${report.overall.precision.toFixed(2)} recall ${report.overall.recall.toFixed(2)} F1 ${report.overall.f1.toFixed(2)}`);
      console.log(`possession agreement ${report.possession.agreement?.toFixed(2)} over ${report.possession.ticks} ticks, coverage ${report.possession.coverage?.toFixed(2)}; out-of-play overlap ${report.out_of_play_overlap?.toFixed(2)}`);
      for (const r of report.per_type) console.log(`  ${r.type.padEnd(24)} hudl ${String(r.hudl).padStart(3)} ours ${String(r.ours).padStart(3)} matched ${String(r.matched).padStart(3)}  P ${r.precision === null ? " -  " : r.precision.toFixed(2)}  R ${r.recall === null ? " -  " : r.recall.toFixed(2)}`);
      console.log("analytics tags by type:", JSON.stringify(report.tags_by_type));
    }
  }
} finally {
  await server.close();
}
