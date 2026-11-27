import {CalibrationBenchmarkPanel,isCalibrationBenchmark} from "../components/videoLab/CalibrationBenchmark";
import {PanoramaPanel} from "../components/videoLab/PanoramaPanel";
import {isPanorama,panoramaBoundaryAt} from "../components/videoLab/panorama";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Film, FlaskConical, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { BoundaryPanel } from "../components/videoLab/BoundaryEditor";
import { boundaryAt } from "../components/videoLab/boundary";
import { indexObservations, LabVideo, overlayAt } from "../components/videoLab/LabVideo";
import { AnalysedExport } from "../components/videoLab/AnalysedExport";
import { MomentRail } from "../components/videoLab/MomentRail";
import { Inspector, decide } from "../components/videoLab/Inspector";
import { PrepareGrouping, TeamSetup, TeamSummary } from "../components/videoLab/TeamSetup";
import { VeoAnalysisPicker } from "../components/videoLab/VeoAnalysisPicker";
import { AnalysisProgress } from "../components/videoLab/AnalysisProgress";
import { PreAnalysisCheck } from "../components/videoLab/PreAnalysisCheck";
import { matchTitle, relatedRuns } from "../components/videoLab/relatedRuns";
import { playShare } from "../components/videoLab/playShare";
import { MacStatusLight } from "../components/videoLab/MacStatusLight";
import { RefineMoments } from "../components/videoLab/RefineMoments";
import { isDense } from "../components/videoLab/playArea";
import { isCameraMotion, outlineAt, type Corners } from "../components/videoLab/pitch";
import { EXTRA_POINTS, fitLandmarks, inverse, project, PITCH_CORNERS, type Landmark } from "../components/videoLab/landmarks";
import { DEFAULT_CORNERS, PitchPanel } from "../components/videoLab/PitchPanel";
import { PitchMap } from "../components/videoLab/PitchMap";
import { ReadShirtNumbers } from "../components/videoLab/ReadShirtNumbers";
import { isShirtCandidates, shirtNumbers } from "../components/videoLab/shirtNumbers";
import { mergeDense } from "../components/videoLab/playArea";
import { buildMoments, filterMoments, type Filter } from "../components/videoLab/moments";
import { rememberKits } from "../components/videoLab/kits";
import { automaticBoundariesFor, labBall, labCamera, labKits, labOffPitch, labRows, labTimeline } from "../components/videoLab/decisions";
import { BASE, csrfToken, useJobFile, useJobText, useReview, useSavedModels } from "../components/videoLab/useLabData";
import type { Appearance, Assignments, Suggestion, VeoTags } from "../components/videoLab/labTypes";

type Sample = { id: string; label: string; duration_s: number; source_offset_s: number };
type Summary = { source_sha256?: string; sampled_frames: number; person_detections: number; ball_detections: number; unique_tracklets: number; ball_observation_coverage: number; football_events_confirmed: number; elapsed_s?: number; quality?: string };
type Job = { id: string; match_title?: string; sample_id?: string; state: string; progress: number; summary?: Summary; artifacts?: string[]; error?: string; mode?: string; parent_job_id?: string };
const LEAD = 3, AFTER = 4;
async function get<T,>(path: string): Promise<T> {
  const response = await fetch(BASE + path, { credentials: "same-origin", cache: "no-store" });
  if (response.status === 409) {
    // Spec 780: an archived run on an away MacBook share says so instead of "unavailable".
    const detail = await response.json().then((b: { detail?: unknown }) => b?.detail, () => undefined);
    if (typeof detail === "string" && detail) throw new Error(detail);
  }
  if (!response.ok) throw new Error("Local video analysis is unavailable. Please retry when the worker is connected.");
  return response.json() as Promise<T>;
}
const isVeo = (v: unknown): v is VeoTags => !!v && Array.isArray((v as VeoTags).events) && Array.isArray((v as VeoTags).highlights);
const isList = (v: unknown): v is Suggestion[] => Array.isArray(v);
const isAssignments = (v: unknown): v is Assignments => !!v && Array.isArray((v as Assignments).observations) && (v as Assignments).image_width > 0;
const isAppearance = (v: unknown): v is Appearance => !!v && Array.isArray((v as Appearance).tracks) && Array.isArray((v as Appearance).groups);
const runLabel = (j: Job) => `${j.id.slice(0, 8)} · ${j.state}${j.mode === "team-enrichment" && j.parent_job_id ? ` · jersey tagging of ${j.parent_job_id.slice(0, 8)}` : j.mode === "review-preparation" && j.parent_job_id ? ` · player grouping of ${j.parent_job_id.slice(0, 8)}` : j.mode === "moment-refinement" && j.parent_job_id ? ` · refined moments of ${j.parent_job_id.slice(0, 8)}` : j.mode === "camera-tracking" && j.parent_job_id ? ` · pitch tracking of ${j.parent_job_id.slice(0, 8)}` : ""}`;

function Workspace({ job, others, onQueued }: { job: Job; others: Job[]; onQueued: (id: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [filter, setFilter] = useState<Filter>({ source: null, team: null, type: null });
  const [cursor, setCursor] = useState<number | null>(null);
  const [auto, setAuto] = useState(true);
  const [track, setTrack] = useState<number | null>(null);
  const [boxes, setBoxes] = useState(true);
  const [everyone, setEveryone] = useState(false);
  const [boundaryEditing,setBoundaryEditing]=useState<Corners|null>(null);
  const [boundarySelected,setBoundarySelected]=useState(0);
  const [marking, setMarking] = useState<Corners | null>(null);
  const [cornerIndices, setCornerIndices] = useState([0,1,2,3]);
  const [markLandmarks, setMarkLandmarks] = useState<Landmark[]>([]);
  const [showOutline, setShowOutline] = useState(true);
  const artifacts = job.artifacts ?? [];
  const has = (name: string) => artifacts.includes(name);
  const veo = useJobFile(job.id, "veo_tags.json", has("veo_tags.json"), isVeo);
  const suggestions = useJobFile(job.id, "event_suggestions.json", has("event_suggestions.json"), isList);
  const assignments = useJobFile(job.id, "team_assignments.json", has("team_assignments.json"), isAssignments);
  const appearance = useJobFile(job.id, "track_appearance.json", has("track_appearance.json"), isAppearance);
  const dense = useJobFile(job.id, "dense_tracks.json", has("dense_tracks.json"), isDense);
  const shirtReads = useJobFile(job.id, "jersey_candidates.json", has("jersey_candidates.json"), isShirtCandidates);
  const motion = useJobFile(job.id, "camera_motion.json", has("camera_motion.json"), isCameraMotion);
  const calibrationBenchmark=useJobFile(job.id,"pitch_calibration_benchmark.json",has("pitch_calibration_benchmark.json"),isCalibrationBenchmark);
  const atlas=has("pitch_atlas.json")&&has("pitch_atlas.jpg");
  const panorama=useJobFile(job.id,atlas?"pitch_atlas.json":"pitch_panorama.json",atlas||(has("pitch_panorama.json")&&has("pitch_panorama.jpg")),isPanorama);
  const { review, update, state, error } = useReview(job.id);
  // Views the registration left unsolved (often the opening seconds) borrow the nearest solved pose, carried with the camera motion.
  const camera = useMemo(() => labCamera(motion.data, panorama.data, review, job.summary?.source_sha256), [motion.data,panorama.data,review?.pitch_panorama,job.summary?.source_sha256]);
  const marks = useMemo(() => review?.pitch_keyframes ?? [], [review?.pitch_keyframes]);
  // Shirt numbers: your corrections, else the worker's reading of each tracked stretch.
  const numbers = useMemo(() => shirtNumbers(shirtReads.data, review?.shirt_numbers), [shirtReads.data, review?.shirt_numbers]);
  const boundaries=useMemo(()=>review?.pitch_boundaries ?? [],[review?.pitch_boundaries]);
  const automaticBoundaries=useMemo(()=>automaticBoundariesFor(motion.data,job.summary?.source_sha256),[motion.data,job.summary?.source_sha256]);
  const currentBoundary=camera ? boundaryAt(camera,boundaries,automaticBoundaries,at):null;
  // A whole-clip refinement (it carries balls) adds the ball only (see labRows).
  const peopleDense = dense.data?.balls ? undefined : dense.data;
  const allRows = useMemo(() => mergeDense(assignments.data?.observations ?? [], peopleDense), [assignments.data, peopleDense]);
  // Spec 760: the team and ball decisions live in decisions.ts, so a benchmark exporter scores exactly what this page shows.
  const teamInputs = useMemo(() => ({ assignments: assignments.data, dense: dense.data, appearance: appearance.data, review, camera, automaticBoundaries, remembered: [] }), [assignments.data, dense.data, appearance.data, review, camera, automaticBoundaries]);
  const offPitch = useMemo(() => labOffPitch(teamInputs), [camera, marks, boundaries, automaticBoundaries, assignments.data]);
  // Spec 660: shirt colours learned from your labels decide teams moment by moment; the appearance
  // model settles only what colour cannot (dark kits). Kits you taught in related runs are reused.
  // Runs of the same match first (a full match is many windows), and derived runs take their source run's title.
  const title = matchTitle(job, others);
  const saved = useSavedModels(relatedRuns(title, others.filter(o => o.id !== job.id && o.state === "complete")));
  const remembered = useMemo(() => rememberKits(saved.data ?? [], title ?? ""), [saved.data, title]);
  // With whole-clip refinement the denser rows (about ten a second, with shirt colours) replace the sampled ones.
  const rows = useMemo(() => labRows(assignments.data, dense.data), [assignments.data, dense.data]);
  const kits = useMemo(() => labKits(rows, review, remembered), [rows, review?.track_labels, remembered]);
  const timeline = useMemo(() => labTimeline(teamInputs, rows, kits, offPitch), [appearance.data, rows, kits, review?.track_labels, review?.group_labels, offPitch, camera, marks, boundaries, automaticBoundaries]);
  const teams = timeline.tracks;
  const denseHasBalls = !!dense.data?.balls?.length;
  const detections = useJobText(job.id, "detections.jsonl", has("detections.jsonl") && (!has("dense_tracks.json") || dense.isFetched) && !denseHasBalls);
  const ball = useMemo(() => labBall(dense.data, detections.data, assignments.data, camera), [dense.data, detections.data, assignments.data, camera]);
  const [showBall, setShowBall] = useState(true);
  const moments = useMemo(() => buildMoments({ veo: veo.data, suggestions: suggestions.data, review, teams }), [veo.data, suggestions.data, review, teams]);
  const visible = useMemo(() => filterMoments(moments, filter), [moments, filter]);
  const current = cursor !== null ? visible[cursor] ?? null : visible.find(m => Math.abs(m.time - at) <= LEAD) ?? null;
  const playAt = useCallback((index: number) => {
    const moment = visible[index], player = video.current;
    if (!moment || !player) return;
    player.currentTime = Math.max(0, moment.time - LEAD); setAt(player.currentTime); setCursor(index);
    void player.play()?.catch(() => undefined);
  }, [visible]);
  useEffect(() => { setCursor(null); }, [filter]);
  useEffect(() => {
    if (!auto || !playing || cursor === null || !visible[cursor] || at <= visible[cursor].time + AFTER) return;
    if (cursor + 1 < visible.length) playAt(cursor + 1); else video.current?.pause();
  }, [at, auto, playing, cursor, visible, playAt]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName) && e.key === " ") return;
      if (e.target instanceof HTMLElement && ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      const step = (d: number) => playAt(Math.min(visible.length - 1, Math.max(0, (cursor ?? (d > 0 ? -1 : visible.length)) + d)));
      if (e.key === " ") { e.preventDefault(); if (video.current?.paused) void video.current.play()?.catch(() => undefined); else video.current?.pause(); }
      else if (e.key === "n") step(1);
      else if (e.key === "p") step(-1);
      else if (current && current.source !== "veo" && ["1", "2", "r"].includes(e.key)) update(r => decide(r, current, e.key === "1" ? "own" : e.key === "2" ? "opponent" : "reject"));
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [visible, cursor, current, playAt, update]);
  const summary = job.summary;
  // Pre-analysis: does the outline in use hold the players? Judged on the level ground, never by atlas rows.
  const atlasData = atlas && panorama.data?.source_sha256 === summary?.source_sha256 ? panorama.data : undefined;
  const outlineAccepted = !!camera?.panorama && review?.pitch_panorama?.accepted === true && review.pitch_panorama.panorama_id === atlasData?.panorama_id;
  const acceptedPoints = outlineAccepted ? review?.pitch_panorama?.points : undefined;
  const play = useMemo(() => atlasData && assignments.data ? playShare(atlasData, acceptedPoints ?? atlasData.suggested_boundary, assignments.data.observations) : null, [atlasData, assignments.data, acceptedPoints]);
  // The clean sample sits under the clickable overlay; annotated.mp4 has boxes burned in.
  const clip = has("sample.mp4") ? "sample.mp4" : has("annotated.mp4") ? "annotated.mp4" : null;
  // The analysed video export paints the same frame as the player, with its current toggles.
  const overlayIndex = useMemo(() => indexObservations(mergeDense(assignments.data?.observations ?? [], peopleDense)), [assignments.data, peopleDense]);
  const frameAt = (time: number) => overlayAt({ w: assignments.data?.image_width ?? 1920, h: assignments.data?.image_height ?? 1080, index: overlayIndex, teams, teamAt: timeline.at, selected: null,
    showBoxes: boxes && !!assignments.data, everyone, ball, showBall, camera, marks, boundaries, automaticBoundaries }, time);
  const withoutOutline = (time: number) => { const frame = frameAt(time); return showOutline ? frame : { ...frame, outline: null, halfway: null }; };
  return <>
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)_330px]">
      <MomentRail moments={moments} visible={visible} filter={filter} setFilter={setFilter} cursor={cursor} onPlay={playAt} />
      <section className="min-w-0 space-y-3" aria-label="Analysis results">
        {clip
          ? <div onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}><LabVideo src={`${BASE}/jobs/${job.id}/files/${clip}`} videoRef={video} at={at} onTime={setAt} assignments={assignments.data} teams={teams} teamAt={timeline.at} ball={ball} showBall={showBall} selected={track} onSelect={id => { setTrack(id); video.current?.pause(); }} showBoxes={boxes} dense={peopleDense} everyone={everyone} camera={camera} marks={marks} showOutline={showOutline} marking={marking} onMarking={setMarking} markLandmarks={markLandmarks} onMarkLandmarks={setMarkLandmarks} boundaries={boundaries} automaticBoundaries={automaticBoundaries} boundaryEditing={boundaryEditing} onBoundaryEditing={setBoundaryEditing} boundarySelected={boundarySelected} onBoundarySelect={setBoundarySelected} /></div>
          : <div className="flex aspect-video items-center justify-center rounded-xl bg-black/40 text-fg-muted">This run has no video.</div>}
        <div className="panel flex flex-wrap items-center gap-2 p-2" aria-label="Moment playback">
          <Button aria-label="Previous moment" disabled={!visible.length} onClick={() => playAt(Math.max(0, (cursor ?? 1) - 1))}><ChevronLeft size={16} aria-hidden />Previous</Button>
          <Button aria-label={playing ? "Pause" : "Play"} onClick={() => { if (video.current?.paused) void video.current.play()?.catch(() => undefined); else video.current?.pause(); }}>{playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}</Button>
          <Button aria-label="Next moment" disabled={!visible.length} onClick={() => playAt(Math.min(visible.length - 1, (cursor ?? -1) + 1))}>Next<ChevronRight size={16} aria-hidden /></Button>
          <span className="text-sm tabular-nums text-fg-muted">{cursor !== null ? `${cursor + 1} of ${visible.length}` : `${visible.length} moments`}</span>
          <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />Play through the list</label>
          {has("team_assignments.json") && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={boxes} onChange={e => setBoxes(e.target.checked)} />Show people</label>}
          {ball.length > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showBall} onChange={e => setShowBall(e.target.checked)} />Show ball</label>}
          {has("team_assignments.json") && <label className="flex items-center gap-2 text-sm" title="Include spectators and people on other pitches"><input type="checkbox" checked={everyone} onChange={e => setEveryone(e.target.checked)} />Show everyone</label>}
        </div>
        {/* Live 2D pitch beside the video: from the automatic outline as soon as a run is analysed, exact once the pitch is marked. */}
        {camera && (marks.length > 0 || !!camera.panorama || !!camera.proposal) && !marking && <PitchMap rows={allRows} camera={camera} marks={marks} size={review?.pitch_size ?? null} at={at} teams={teams} teamAt={timeline.at} selected={track} onSelect={id => setTrack(id)} videoRef={video} ball={showBall ? ball : undefined} frame={{ w: assignments.data?.image_width ?? 1920, h: assignments.data?.image_height ?? 1080 }} everyone={everyone} numbers={numbers} onSize={size => update(r => ({ ...r, pitch_size: size }))} />}
        {summary && <PreAnalysisCheck summary={summary} atlas={atlasData} accepted={outlineAccepted} play={play} groups={appearance.data?.groups.length ?? 0} trackLabels={review?.track_labels ?? []} groupLabels={review?.group_labels ?? []} rememberedKits={remembered} />}
        {summary?.source_sha256 && review && <PanoramaPanel key={job.id} jobId={job.id} sourceHash={summary.source_sha256} data={panorama.data} review={review.pitch_panorama} onAccept={value=>update(r=>({...r,pitch_panorama:value}))} onQueued={onQueued}/>}
        {summary?.source_sha256 && <CalibrationBenchmarkPanel jobId={job.id} sourceHash={summary.source_sha256} data={calibrationBenchmark.data}/>}
        {camera?.panorama && !panoramaBoundaryAt(camera.panorama,at) && <p role="status" className="text-sm text-warn">No usable pitch projection in this view. The panorama remains accepted for other registered moments.</p>}
        {camera && review && !camera.panorama && <BoundaryPanel editing={boundaryEditing} selected={boundarySelected} setSelected={setBoundarySelected} onChange={setBoundaryEditing} marks={boundaries} manual={!!boundaryAt(camera,boundaries,[],at)} automatic={!!currentBoundary}
          onStart={()=>{video.current?.pause();setMarking(null);setBoundarySelected(0);const time=video.current?.currentTime ?? at;setBoundaryEditing(boundaryAt(camera,boundaries,automaticBoundaries,time) ?? outlineAt(camera,marks,time) ?? DEFAULT_CORNERS);}}
          onSave={()=>{const time=Math.round((video.current?.currentTime ?? at)*1000)/1000;update(r=>({...r,pitch_boundaries:[...(r.pitch_boundaries ?? []).filter(k=>Math.abs(k.time_s-time)>=0.001),{time_s:time,points:boundaryEditing!}].sort((a,b)=>a.time_s-b.time_s)}));setBoundaryEditing(null);}}
          onCancel={()=>setBoundaryEditing(null)} onDelete={time=>update(r=>({...r,pitch_boundaries:(r.pitch_boundaries ?? []).filter(k=>k.time_s!==time)}))}
          onSeek={time=>{if(video.current){video.current.pause();video.current.currentTime=time;setAt(time);}}} />}
        {has("team_assignments.json") && summary?.source_sha256 && <PitchPanel jobId={job.id} sourceHash={summary.source_sha256} hasCamera={has("camera_motion.json")} marks={marks} at={at} marking={!!marking} onQueued={onQueued}
          cornerIndices={cornerIndices} onCornerIndices={setCornerIndices} canSave={!!(marking && fitLandmarks([...marking.flatMap((image,i)=>cornerIndices.includes(i)?[{image,pitch:PITCH_CORNERS[i]}]:[]),...markLandmarks]))} landmarks={markLandmarks} onAddPoint={name => { const point=EXTRA_POINTS.find(p=>p.name===name); const h=marking && fitLandmarks(marking.map((image,i)=>({image,pitch:PITCH_CORNERS[i]}))); if(point && h) setMarkLandmarks(points=>[...points,{...point,image:project(inverse(h),point.pitch)}]); }}
          onStart={() => { setBoundaryEditing(null); video.current?.pause(); const time=video.current?.currentTime ?? at; const existing=marks.find(m=>Math.abs(m.time_s-time)<0.05); setCornerIndices(existing?.fit_corner_indices ?? [0,1,2,3]); setMarkLandmarks(existing?.landmarks ?? []); setMarking(existing?.corners ?? (camera && outlineAt(camera, marks, time)) ?? DEFAULT_CORNERS); }}
          onSave={() => { const time = Math.round((video.current?.currentTime ?? at) * 1000) / 1000, corners = marking!; update(r => ({ ...r, pitch_keyframes: [...(r.pitch_keyframes ?? []).filter(k => Math.abs(k.time_s - time) >= 0.001), { time_s: time, corners, ...(markLandmarks.length || cornerIndices.length!==4?{landmarks:markLandmarks}:{}), ...(cornerIndices.length!==4?{fit_corner_indices:cornerIndices}:{}) }].sort((a, b) => a.time_s - b.time_s) })); setMarking(null); }}
          onCancel={() => setMarking(null)} onDelete={time => update(r => ({ ...r, pitch_keyframes: (r.pitch_keyframes ?? []).filter(k => k.time_s !== time) }))}
          onSeek={time => { if (video.current) { video.current.pause(); video.current.currentTime = time; setAt(time); } }} showOutline={showOutline} setShowOutline={setShowOutline} />}
        {has("team_assignments.json") && has("detections.jsonl") && summary?.source_sha256 && camera && <ReadShirtNumbers jobId={job.id} sourceHash={summary.source_sha256} again={has("jersey_candidates.json")} onQueued={onQueued} />}
        {has("team_assignments.json") && !has("dense_tracks.json") && moments.length > 0 && summary?.source_sha256 && <RefineMoments jobId={job.id} sourceHash={summary.source_sha256} onQueued={onQueued} />}
        {appearance.data && review ? <TeamSetup jobId={job.id} appearance={appearance.data} review={review} update={update} teams={teams} kits={kits} remembered={remembered} />
          : !has("track_appearance.json") && summary?.source_sha256 && <PrepareGrouping jobId={job.id} sourceHash={summary.source_sha256} onQueued={onQueued} />}
        {appearance.data && !appearance.data.tracks.some(t=>t.views?.length) && summary?.source_sha256 && <PrepareGrouping upgrade jobId={job.id} sourceHash={summary.source_sha256} onQueued={onQueued} />}
        <TeamSummary moments={moments} />
        {summary && <details className="panel p-4"><summary className="cursor-pointer font-semibold">What these results mean</summary>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">No confirmed football events are produced automatically. Model suggestions and estimated teams wait for your approval. Tracked people are short stretches, not named players, and may include referees and spectators. Ball proximity does not establish possession.</p>
          <dl className="mt-3 grid grid-cols-4 gap-3 text-sm">{[["Sampled frames", summary.sampled_frames], ["Person detections", summary.person_detections], ["Ball detections", summary.ball_detections], ["Short tracklets", summary.unique_tracklets]].map(([label, value]) => <div key={label}><dt className="text-xs text-fg-muted">{label}</dt><dd className="font-semibold">{Number(value).toLocaleString()}</dd></div>)}</dl>
          <p className="mt-2 text-sm">Ball observed in {(summary.ball_observation_coverage * 100).toFixed(1)}% of sampled frames.</p></details>}
        <details className="panel p-4"><summary className="cursor-pointer font-semibold">Download results</summary><div className="mt-3 flex flex-wrap gap-2">{has("sample.mp4") && <AnalysedExport src={`${BASE}/jobs/${job.id}/files/sample.mp4`} title={job.match_title ?? "Video Lab"} frameAt={withoutOutline} />}
          {artifacts.map(name => <a key={name} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent" href={`${BASE}/jobs/${job.id}/files/${name}`} download><Download size={14} aria-hidden />{name === "annotated.mp4" ? "Download raw detections (annotated.mp4)" : `Download ${name}`}</a>)}</div></details>
      </section>
      <Inspector jobId={job.id} review={review} update={update} state={state} error={error} moment={current} track={track} teams={teams} teamAt={timeline.at} appearance={appearance.data} at={at} numbers={numbers} />
    </div>
  </>;
}

export default function VideoLabPage() {
  const cache = useQueryClient();
  const [sample, setSample] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const samples = useQuery({ queryKey: ["video-lab-samples"], queryFn: () => get<Sample[]>("/samples"), retry: false });
  const jobs = useQuery({ queryKey: ["video-lab-jobs"], queryFn: () => get<Job[]>("/jobs"), retry: false,
    refetchInterval: q => q.state.data?.some(j => ["queued", "running"].includes(j.state)) ? 2000 : false });
  const job = useQuery({ queryKey: ["video-lab-job", selected], queryFn: () => get<Job>(`/jobs/${selected}`), enabled: !!selected, retry: false,
    refetchInterval: q => ["queued", "running"].includes(q.state.data?.state ?? "") ? 2000 : false });
  useEffect(() => { if (!selected && jobs.data?.length) setSelected(jobs.data[0].id); }, [jobs.data, selected]);
  const submit = useMutation({ mutationFn: async () => {
    const response = await fetch(BASE + "/jobs", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify({ sample_id: sample || samples.data?.[0]?.id }) });
    if (!response.ok) throw new Error(response.status === 409 ? "An analysis is already queued or running." : "Could not start analysis.");
    return response.json() as Promise<Job>;
  }, onSuccess: data => { setSelected(data.id); cache.setQueryData(["video-lab-job", data.id], data); void cache.invalidateQueries({ queryKey: ["video-lab-jobs"] }); } });
  const queued = useCallback((id: string) => { setSelected(id); void cache.invalidateQueries({ queryKey: ["video-lab-jobs"] }); void cache.invalidateQueries({queryKey:["video-lab-samples"]}); },[cache]);
  const active = job.data;
  const running = active && ["queued", "running"].includes(active.state);
  const error = samples.error || jobs.error || job.error || submit.error;
  const chosen = samples.data?.find(s => s.id === sample) || samples.data?.[0];
  const duration = chosen?.duration_s ?? 120;
  const durationLabel = duration === 120 ? "two minutes" : `${duration / 60} minutes`;
  return <div className="mx-auto w-full max-w-[1800px] space-y-4 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-accent"><FlaskConical size={16} aria-hidden />Private preview · local processing</p><h1 className="text-2xl font-semibold">Video analysis lab</h1>
        <p className="mt-1 text-sm text-fg-muted">Watch tagged moments, approve or correct them, and tell the lab which team each player is on.</p></div>
      <div className="flex flex-wrap items-center gap-2 self-start"><MacStatusLight /><Link to="/video-lab/labels" className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">Label frames for the detector</Link></div>

    </header>
    <VeoAnalysisPicker busy={!!running || !!jobs.data?.some(j=>["queued","running"].includes(j.state))} onQueued={queued} />
    {error && <p role="alert" className="panel p-4 text-warn">{error.message}</p>}
    {!!jobs.data?.length && <nav className="panel space-y-2 p-3" aria-label="Previous runs"><label className="block text-sm">Analysis run<select className="mt-1 block w-full rounded-lg border border-line bg-ink-900 p-2" value={selected ?? ""} onChange={e=>setSelected(e.target.value)}>{jobs.data.map(j=>{const sample=samples.data?.find(s=>s.id===j.sample_id);const name=j.match_title || sample?.label || j.sample_id || "Uncatalogued run";return <option key={j.id} value={j.id}>{name}{sample?.duration_s?` · ${Math.round(sample.duration_s/60)} min`:""} · {runLabel(j)}</option>;})}</select></label>
      {jobs.data.filter(j=>!j.sample_id).map(j=><button key={j.id} className="mr-2 text-xs text-fg-muted" onClick={()=>setSelected(j.id)}>{runLabel(j)}</button>)}
    </nav>}
    {active && active.state !== "complete" && <div role="status" className="panel space-y-2 p-4"><p className="text-sm capitalize">{active.state} · {Math.round((active.progress || 0) * 100)}%</p><AnalysisProgress label="Analysis progress" fraction={active.progress || 0} />{active.error && <p className="text-sm text-warn">{active.error}</p>}
      <div className="flex aspect-[32/9] flex-col items-center justify-center gap-3 rounded-xl bg-black/40 text-fg-muted"><Film size={32} aria-hidden /><p>{running ? "Analysing… you can keep this page open." : "This run did not finish."}</p></div></div>}
    {active?.state === "complete" && <Workspace key={active.id} job={active} others={jobs.data ?? []} onQueued={queued} />}
      <div className="panel flex flex-wrap items-end gap-3 p-3">
        <label className="text-sm">Prepared sample<select className="mt-1 block w-64 rounded-lg border border-line bg-ink-900 p-1.5" value={sample || samples.data?.[0]?.id || ""} onChange={e => setSample(e.target.value)}>{samples.data?.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <div><p className="mb-1 max-w-52 text-xs text-fg-muted">{duration}-second local sample. Originals stay unchanged. Processing runs on this Mac.</p>
          <Button onClick={() => submit.mutate()} disabled={!samples.data?.length || submit.isPending || !!running}>{submit.isPending ? "Queueing…" : `Analyse ${durationLabel}`}</Button></div>
      </div>
  </div>;
}
