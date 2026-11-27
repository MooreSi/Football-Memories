// Read-only summary of what Video Lab shows for one run, through the page's own functions:
// outline play share, team counts among central people, ball frames. Kits remembered from the
// runs given after the job folder are applied, like the page.
//   cd frontend && node scripts/lab-run-summary.mjs <job folder> [same-match job folders...]
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const [jobArg, ...others] = process.argv.slice(2);
const job = resolve(jobArg), result = join(job, "result");
const json = (dir, name) => (existsSync(join(dir, name)) ? JSON.parse(readFileSync(join(dir, name), "utf8")) : undefined);
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { labPredictions, labRows, labKits } = await server.ssrLoadModule("/src/components/videoLab/decisions.ts");
  const { playShare } = await server.ssrLoadModule("/src/components/videoLab/playShare.ts");
  const { rememberKits } = await server.ssrLoadModule("/src/components/videoLab/kits.ts");
  const review = json(job, "review.json") ?? null;
  const summary = json(result, "summary.json");
  const atlas = json(result, "pitch_atlas.json");
  const assignments = json(result, "team_assignments.json");
  const title = json(job, "request.json")?.match_title ?? "";
  const models = others.map(o => { const d = join(resolve(o), "label-models"); if (!existsSync(d)) return null; const f = readdirSync(d).sort((a, b) => parseInt(a) - parseInt(b)).pop(); return f ? { title, examples: JSON.parse(readFileSync(join(d, f), "utf8")).examples } : null; }).filter(Boolean);
  const remembered = rememberKits(models, title);
  const files = {
    sourceSha: summary?.source_sha256, assignments, review, appearance: json(result, "track_appearance.json"), dense: json(result, "dense_tracks.json"),
    motion: json(result, "camera_motion.json"), panorama: atlas ?? json(result, "pitch_panorama.json"), remembered,
    detections: existsSync(join(result, "detections.jsonl")) ? readFileSync(join(result, "detections.jsonl"), "utf8") : undefined,
  };
  const p = labPredictions(files);
  const central = new Map(assignments.observations.map(o => [`${o.time_s}|${o.track_id}`, o.central]));
  const shown = p.observations.filter(o => o.shown && central.get(`${o.time_s}|${o.track_id}`));
  const count = k => shown.filter(k).length;
  const times = new Set(assignments.observations.map(o => o.time_s));
  const acc = review?.pitch_panorama?.accepted && review.pitch_panorama.panorama_id === atlas?.panorama_id ? review.pitch_panorama.points : null;
  const shirts = json(result, "jersey_numbers.json") ?? json(result, "shirt_numbers.json");
  console.log(JSON.stringify({
    job: job.split("/").pop(), title, offset: assignments.source_offset_s, labels: review?.track_labels?.length ?? 0, remembered: remembered.length, kits: p.kits,
    play_auto: atlas ? playShare(atlas, atlas.suggested_boundary, assignments.observations) : null,
    play_accepted: acc && atlas ? playShare(atlas, acc, assignments.observations) : null,
    panorama: atlas ? `${atlas.frame_to_panorama.filter(Boolean).length}/${atlas.times.length}` : null,
    central_shown: shown.length,
    own: count(o => o.team === "own"), opponent: count(o => o.team === "opponent"), referee: count(o => o.role === "referee"), unassigned: count(o => !o.team && o.role !== "referee"),
    ball_frames: `${p.ball.length}/${times.size}`,
    kit_list: labKits(labRows(assignments, files.dense), review, remembered).map(k => [k.team, k.role, k.lab.map(Math.round), k.examples]),
    shirt_file: shirts ? Object.keys(shirts).join(",") : null,
  }));
} finally {
  await server.close();
}
