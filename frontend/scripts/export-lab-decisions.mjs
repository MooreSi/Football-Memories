// Spec 760: export the Video Lab's own team and ball decisions for one completed run, for the
// worker's `lighting-benchmark score`. Read-only: it reads the job folder and writes one new file.
//
//   node scripts/export-lab-decisions.mjs <job folder> <output.json> [--no-labels] [--colour raw|balanced]
//
// The job folder is the worker's runtime/jobs/<id> (result/ plus review.json). Uses the same
// functions as the page (src/components/videoLab/decisions.ts), loaded through Vite. Kits
// remembered from other runs are not applied (the page may add them); --no-labels ignores
// review.json track labels; --colour balanced asks for the worker's light-balanced shirt colour
// (spec 760 Part B; off in the page because it failed the adoption gate).
import { createHash } from "node:crypto";
import { createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const [jobArg, outArg, ...flags] = process.argv.slice(2);
const colourAt = flags.indexOf("--colour");
const colour = colourAt >= 0 ? flags[colourAt + 1] : undefined;
if (!jobArg || !outArg || (colourAt >= 0 && !["raw", "balanced"].includes(colour))) {
  console.error("usage: node scripts/export-lab-decisions.mjs <job folder> <output.json> [--no-labels] [--colour raw|balanced]");
  process.exit(2);
}
const job = resolve(jobArg), result = join(job, "result"), out = resolve(outArg);
if (existsSync(out)) {
  console.error(`${out} already exists; write a new file`);
  process.exit(1);
}
const json = name => (existsSync(join(result, name)) ? JSON.parse(readFileSync(join(result, name), "utf8")) : undefined);
const sha256 = path => new Promise((done, fail) => {
  const hash = createHash("sha256");
  createReadStream(path).on("data", d => hash.update(d)).on("end", () => done(hash.digest("hex"))).on("error", fail);
});

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const { labPredictions } = await server.ssrLoadModule("/src/components/videoLab/decisions.ts");
  const review = existsSync(join(job, "review.json")) ? JSON.parse(readFileSync(join(job, "review.json"), "utf8")) : null;
  if (review && flags.includes("--no-labels")) review.track_labels = [];
  const atlas = existsSync(join(result, "pitch_atlas.json")) && existsSync(join(result, "pitch_atlas.jpg"));
  const summary = json("summary.json");
  const files = {
    sourceSha: summary?.source_sha256,
    assignments: json("team_assignments.json"),
    review,
    appearance: json("track_appearance.json"),
    dense: json("dense_tracks.json"),
    motion: json("camera_motion.json"),
    panorama: json(atlas ? "pitch_atlas.json" : "pitch_panorama.json"),
    colour,
    detections: existsSync(join(result, "detections.jsonl")) ? readFileSync(join(result, "detections.jsonl"), "utf8") : undefined,
  };
  const predictions = labPredictions(files);
  // The benchmark binds to the exact sample.mp4 the audit was made from.
  predictions.source_sha256 = await sha256(join(result, "sample.mp4"));
  predictions.exported = { job: job.split("/").pop(), track_labels: review?.track_labels?.length ?? 0, remembered_kits: 0 };
  writeFileSync(out, JSON.stringify(predictions), { flag: "wx" });
  console.log(JSON.stringify({ observations: predictions.observations.length, ball: predictions.ball.length, kits: predictions.kits, labels: predictions.exported.track_labels, colour: predictions.colour }));
} finally {
  await server.close();
}
