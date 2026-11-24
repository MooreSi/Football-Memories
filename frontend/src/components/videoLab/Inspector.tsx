import { useState } from "react";
import { Button } from "../ui/Button";
import type { Moment } from "./moments";
import { ACTION_TYPES, clock, teamName, typeName, type ActionType, type Appearance, type Assignment, type Review, type Role, type Team } from "./labTypes";
import { BASE, type SaveState } from "./useLabData";
import { TEAM_COLOUR } from "./LabVideo";

export const asAction = (type: string): ActionType => {
  const key = type.replaceAll(" ", "_");
  return (ACTION_TYPES as readonly string[]).includes(key) ? key as ActionType : key === "shot_on_goal" ? "shot" : "other";
};
const EVIDENCE: Record<string, string> = { ball_nearest: "player nearest the ball", camera_focus: "players where the camera was pointing (no ball seen)" };
const SAVE: Record<SaveState, string> = { idle: "", pending: "Unsaved changes…", saving: "Saving…", saved: "All changes saved", error: "Not saved" };
const card = "panel space-y-3 p-4";

type Change = (change: (review: Review) => Review) => void;

export function decide(review: Review, moment: Moment, team: Team | null | "reject", type?: ActionType): Review {
  const events = review.events.filter(e => e.id !== moment.id);
  const rejected = review.rejected_suggestions.filter(id => id !== moment.id);
  if (team === "reject") return { ...review, events, rejected_suggestions: moment.source === "model" ? [...rejected, moment.id] : rejected };
  return { ...review, rejected_suggestions: rejected, events: [...events, { id: moment.id, type: type ?? asAction(moment.type), time_s: moment.time, track_id: null, confirmed: true, team }] };
}

function MomentCard({ moment, update }: { moment: Moment | null; update: Change }) {
  const [type, setType] = useState<ActionType | "">("");
  if (!moment) return <section className={card} aria-label="Current moment"><h2 className="font-semibold">Current moment</h2><p className="text-sm text-fg-muted">Pick a moment on the left, or press N for the next one. Its clip plays from a few seconds before.</p></section>;
  const chosen = type || asAction(moment.type);
  const editable = moment.source !== "veo";
  return <section className={card} aria-label="Current moment">
    <div className="flex items-baseline justify-between gap-2"><h2 className="font-semibold capitalize">{moment.type}</h2><span className="text-sm tabular-nums text-fg-muted">{clock(moment.time)}{moment.sourceTime !== undefined ? ` · match ${clock(moment.sourceTime)}` : ""}</span></div>
    <p className="text-sm">{moment.source === "veo" ? "Veo tag" : moment.source === "model" ? "Model suggestion" : "Added by you"} · <span className="font-medium">{teamName(moment.team)}</span>
      {moment.teamBasis === "estimated" && <span className="block text-xs text-fg-muted">Team estimated from the {EVIDENCE[moment.evidence ?? ""] ?? "nearby players"}. Check before approving.</span>}
      {moment.status === "approved" && <span className="block text-xs text-accent">Approved by you</span>}
      {moment.status === "rejected" && <span className="block text-xs text-warn">Rejected by you</span>}</p>
    {!editable && <p className="text-xs text-fg-muted">Veo tags are shown as Veo recorded them. Their team comes from Veo.</p>}
    {editable && <>
      <label className="block text-xs text-fg-muted">What happened<select className="mt-1 w-full rounded-md border border-line bg-ink-900 p-1.5 text-sm text-fg" value={chosen} onChange={e => setType(e.target.value as ActionType)}>{ACTION_TYPES.map(t => <option key={t} value={t}>{typeName(t)}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => update(r => decide(r, moment, "own", chosen))} style={{ borderColor: TEAM_COLOUR.own }}>Approve · Our team <kbd className="text-[10px] opacity-60">1</kbd></Button>
        <Button onClick={() => update(r => decide(r, moment, "opponent", chosen))} style={{ borderColor: TEAM_COLOUR.opponent }}>Approve · Opponent <kbd className="text-[10px] opacity-60">2</kbd></Button>
        <Button onClick={() => update(r => decide(r, moment, null, chosen))}>Approve · team unknown</Button>
        <Button variant="ghost" onClick={() => update(r => decide(r, moment, "reject"))}>{moment.source === "you" ? "Delete" : "Reject"} <kbd className="text-[10px] opacity-60">R</kbd></Button>
      </div>
    </>}
  </section>;
}

const ROLES: { label: string; team: Team | null; role: Role }[] = [
  { label: "Our player", team: "own", role: "player" }, { label: "Opponent player", team: "opponent", role: "player" },
  { label: "Our goalkeeper", team: "own", role: "goalkeeper" }, { label: "Opponent goalkeeper", team: "opponent", role: "goalkeeper" },
  { label: "Referee", team: null, role: "referee" }, { label: "Not a player", team: null, role: "other" },
];
const SOURCE: Record<Assignment["source"], string> = { you: "labelled by you", group: "from your label for its look-alike group", similar: "suggested: looks like players you labelled", model: "suggested from kit colour", none: "not assigned yet" };

function PersonCard({ track, info, appearance, jobId, review, update }: { track: number | null; info?: Assignment; appearance?: Appearance; jobId: string; review: Review; update: Change }) {
  if (track === null) return <section className={card} aria-label="Selected person"><h2 className="font-semibold">Selected person</h2><p className="text-sm text-fg-muted">Click a person on the video to say which team they play for. Dashed boxes are suggestions; solid boxes are your labels. Each label also improves the suggestions for similar-looking players.</p></section>;
  const entry = appearance?.tracks.find(t => t.track_id === track);
  const sprite = appearance?.sprite;
  const mine = review.track_labels.find(l => l.track_id === track);
  const set = (team: Team | null, role: Role) => update(r => ({ ...r, track_labels: [...r.track_labels.filter(l => l.track_id !== track), { track_id: track, team, role }] }));
  return <section className={card} aria-label="Selected person">
    <div className="flex gap-3">
      {entry && sprite && <div aria-hidden className="h-16 w-8 shrink-0 rounded" style={{ backgroundImage: `url(${BASE}/jobs/${jobId}/files/${sprite.file})`, backgroundPosition: `-${(entry.thumb % sprite.cols) * sprite.w}px -${Math.floor(entry.thumb / sprite.cols) * sprite.h}px`, width: sprite.w, height: sprite.h }} />}
      <div className="min-w-0 text-sm"><h2 className="font-semibold">Person {track}</h2>
        {entry && <p className="text-xs text-fg-muted">On screen {clock(entry.start_s)}–{clock(entry.end_s)} (one tracked stretch, not the whole match)</p>}
        <p>{info?.role === "referee" ? "Referee" : info?.role === "other" ? "Not a player" : teamName(info?.team)}{info?.role === "goalkeeper" ? " goalkeeper" : ""} <span className="text-xs text-fg-muted">· {SOURCE[info?.source ?? "none"]}</span></p></div>
    </div>
    <div className="grid grid-cols-2 gap-2">{ROLES.map(r => <Button key={r.label} aria-pressed={mine?.team === r.team && mine?.role === r.role} className={mine?.team === r.team && mine?.role === r.role ? "ring-2 ring-accent" : ""} onClick={() => set(r.team, r.role)}>{r.label}</Button>)}</div>
    {mine && <button className="text-xs text-fg-muted underline" onClick={() => update(r => ({ ...r, track_labels: r.track_labels.filter(l => l.track_id !== track) }))}>Clear my label</button>}
  </section>;
}

function AddMoment({ at, update }: { at: number; update: Change }) {
  const [type, setType] = useState<ActionType>("pass");
  const add = (team: Team | null) => update(r => ({ ...r, events: [...r.events, { id: `mine-${crypto.randomUUID()}`, type, time_s: Math.round(at * 1000) / 1000, track_id: null, confirmed: true, team }] }));
  return <section className={card} aria-label="Add a moment"><h2 className="font-semibold">Add a missed moment at {clock(at)}</h2>
    <select aria-label="Moment type" className="w-full rounded-md border border-line bg-ink-900 p-1.5 text-sm" value={type} onChange={e => setType(e.target.value as ActionType)}>{ACTION_TYPES.map(t => <option key={t} value={t}>{typeName(t)}</option>)}</select>
    <div className="grid grid-cols-3 gap-2"><Button onClick={() => add("own")}>Our team</Button><Button onClick={() => add("opponent")}>Opponent</Button><Button onClick={() => add(null)}>Unknown</Button></div>
  </section>;
}

type Props = { jobId: string; review: Review | null; update: Change; state: SaveState; error: string; moment: Moment | null; track: number | null; teams: Map<number, Assignment>; appearance?: Appearance; at: number };

export function Inspector({ jobId, review, update, state, error, moment, track, teams, appearance, at }: Props) {
  return <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto" aria-label="Review tools">
    <p role="status" className={`text-right text-xs ${state === "error" ? "text-warn" : "text-fg-muted"}`}>{error || SAVE[state]}</p>
    {review ? <>
      <MomentCard key={moment?.key ?? "none"} moment={moment} update={update} />
      <PersonCard track={track} info={track === null ? undefined : teams.get(track)} appearance={appearance} jobId={jobId} review={review} update={update} />
      <AddMoment at={at} update={update} />
    </> : !error && <p className="text-sm text-fg-muted">Loading your labels…</p>}
    <p className="text-xs leading-relaxed text-fg-muted">Keys: Space play/pause · N next · P previous · 1 Our team · 2 Opponent · R reject. Nothing is confirmed until you approve it; your labels are saved separately and the analysis files never change.</p>
  </aside>;
}
