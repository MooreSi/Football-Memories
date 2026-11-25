import {BASE} from "./useLabData";
export type CalibrationBenchmark={schema_version:1;source_sha256:string;annotation_origin:"assistant_visual"|"human_reviewed"|"synthetic";score_image_size:number[];methods:{id:string;label:string;checked_frames:number;total_check_frames:number;line_median_px:number|null;line_p95_px:number|null}[];promotion:{status:"not_promoted"|"eligible_for_review";candidate:string|null;reasons:string[]};comparison_image:string;requires_review:true};
export function isCalibrationBenchmark(v:unknown):v is CalibrationBenchmark{
 if(!v||typeof v!=="object")return false;
 const p=v as CalibrationBenchmark;
 const count=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=20000;
 const error=(n:unknown)=>n===null||(typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<1e9);
 return p.schema_version===1&&/^[a-f0-9]{64}$/.test(p.source_sha256)&&["assistant_visual","human_reviewed","synthetic"].includes(p.annotation_origin)&&Array.isArray(p.score_image_size)&&p.score_image_size.length===2&&p.score_image_size.every(n=>count(n)&&n>0)&&Array.isArray(p.methods)&&p.methods.length<=8&&p.methods.every(m=>!!m&&typeof m==="object"&&typeof m.id==="string"&&typeof m.label==="string"&&count(m.checked_frames)&&count(m.total_check_frames)&&m.checked_frames<=m.total_check_frames&&error(m.line_median_px)&&error(m.line_p95_px))&&!!p.promotion&&["not_promoted","eligible_for_review"].includes(p.promotion.status)&&Array.isArray(p.promotion.reasons)&&p.promotion.reasons.every(r=>typeof r==="string")&&p.comparison_image==="pitch_calibration_comparison.jpg"&&p.requires_review===true;
}
const pixels=(n:number|null)=>n===null?"Unavailable":`${n.toFixed(1)} px`;
export function CalibrationBenchmarkPanel({jobId,sourceHash,data}:{jobId:string;sourceHash:string;data?:CalibrationBenchmark}){
 if(!data||data.source_sha256!==sourceHash)return null;
 const url=`${BASE}/jobs/${jobId}/files/`;
 return <section className="panel min-w-0 space-y-3 p-3" aria-label="Calibration experiment">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Calibration comparison</h2><span className="text-xs text-fg-muted">{data.promotion.status==="not_promoted"?"Experimental · not applied":"Candidate eligible for further review"}</span></div>
  <p className="text-sm text-fg-muted">Current calibration remains in use. These alternatives were compared against separately marked frames; a low fitting error alone does not establish accuracy.</p>
  <p className="text-xs text-fg-muted">{data.annotation_origin==="assistant_visual"?"Assistant-marked checks · independent human verification pending.":data.annotation_origin==="human_reviewed"?"Human-reviewed check markings.":"Synthetic check fixture · not real-game accuracy."} Errors are image pixels at {data.score_image_size.join(" × ")}; lower is better. Missing projections reduce coverage.</p>
  <div className="overflow-x-auto"><table className="w-full text-left text-xs tabular-nums" aria-label="Pitch calibration comparison"><thead><tr className="border-b border-line"><th className="p-2">Method</th><th className="p-2">Checked views</th><th className="p-2">Median error</th><th className="p-2">95th percentile</th></tr></thead><tbody>{data.methods.map(m=><tr key={m.id} className="border-b border-line/50"><th className="p-2 font-normal">{m.label}</th><td className="p-2">{m.checked_frames}/{m.total_check_frames}</td><td className="whitespace-nowrap p-2">{pixels(m.line_median_px)}</td><td className="whitespace-nowrap p-2">{pixels(m.line_p95_px)}</td></tr>)}</tbody></table></div>
  <p className="text-xs text-fg-muted">The upstream model uses an adult 105 × 68 m template. Youth pitch dimensions and markings need verification before relying on the shape or metres. A result on a few checked views does not establish whole-game accuracy.</p>
  <a href={url+data.comparison_image} target="_blank" rel="noreferrer"><img src={url+data.comparison_image} alt="Pitch calibration comparison frames" className="block w-full rounded-lg"/></a>
  <p className="text-xs text-fg-muted">Cyan marks the check line; magenta shows the predicted line. Open the image to inspect each view at full size.</p>
  <div className="flex flex-wrap gap-3 text-xs underline"><a href={url+"pitch_calibration_benchmark.json"} download>Download comparison report</a><a href={url+"pitch_landmarks.json"} download>Download predicted pitch landmarks</a></div>
 </section>;
}
