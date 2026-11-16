import { Goal as GoalIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatClock } from "../../lib/format";
import { type Goal, type GoalsEntry, type GoalsSource, type Keeper, matchGoals, useGoalEntries, useSaveGoals } from "../../lib/goals";
import { Button } from "../ui/Button";

type DraftGoal = { id: string; side: "ours" | "theirs"; time_s: number | null; added: boolean; scorer: string; keeper: string };
type Draft = { goals: DraftGoal[]; removed: string[]; keepers: { name: string; saves: string }[] };

const Tag = ({ children }: { children: string }) =>
  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-subtle">{children}</span>;

function savesText(k: Keeper): string {
  const saves = k.saves === null ? "Saves not counted" : `${k.saves} save${k.saves === 1 ? "" : "s"}`;
  return `${saves} · ${k.conceded} conceded`;
}

/** Spec 270 (owner requests 2026-11-16): who scored, who kept goal, saves and goals
 *  conceded for one match. Hudl and Veo name nobody, so names start as a guess from the
 *  players tagged at each goal ("Likely") until the owner saves them. */
export function GoalsPanel({ match, club, onSeek }: { match: GoalsSource & { id: string }; club: string | null; onSeek?: (t: number) => void }) {
  const entries = useGoalEntries();
  const save = useSaveGoals();
  const entry = entries.data?.[match.id];
  const data = matchGoals(match, club, entry);
  const [draft, setDraft] = useState<Draft | null>(null);
  const ours = data.goals.filter((g) => g.side === "ours");
  const theirs = data.goals.filter((g) => g.side === "theirs");
  const names = [...new Set([...data.players, ...Object.values(entries.data ?? {}).flatMap((e) => [...Object.values(e.scorers), ...e.keepers.map((k) => k.name)])])].sort();
  const listId = `goal-names-${match.id}`;

  const start = () => setDraft({
    goals: data.goals.map((g) => ({ id: g.id, side: g.side, time_s: g.time_s, added: g.added, scorer: g.scorer ?? "", keeper: g.keeper ?? "" })),
    removed: entry?.removed ?? [],
    keepers: data.keepers.filter((k) => k.name || k.saves !== null).map((k) => ({ name: k.name ?? "", saves: k.saves === null ? "" : String(k.saves) })),
  });
  const valid = draft?.keepers.every((k) => /^\d{0,2}$/.test(k.saves.trim())) ?? false;
  const submit = () => {
    if (!draft) return;
    const keepers = draft.keepers.filter((k) => k.name.trim()).map((k) => ({ name: k.name.trim(), saves: k.saves.trim() === "" ? null : Number(k.saves) }));
    const next: GoalsEntry = {
      scorers: Object.fromEntries(draft.goals.filter((g) => g.side === "ours" && g.scorer.trim()).map((g) => [g.id, g.scorer.trim()])),
      added: draft.goals.filter((g) => g.added).map((g) => ({ id: g.id, side: g.side })),
      removed: draft.removed,
      keepers,
      beaten: Object.fromEntries(draft.goals.filter((g) => g.side === "theirs" && keepers.some((k) => k.name === g.keeper.trim())).map((g) => [g.id, g.keeper.trim()])),
    };
    save.mutate({ id: match.id, entry: next }, { onSuccess: () => setDraft(null) });
  };
  const setGoal = (id: string, patch: Partial<DraftGoal>) => setDraft((d) => d && { ...d, goals: d.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const removeGoal = (g: DraftGoal) => setDraft((d) => d && { ...d, goals: d.goals.filter((x) => x.id !== g.id), removed: g.added ? d.removed : [...d.removed, g.id] });
  const addGoal = (side: "ours" | "theirs") => setDraft((d) => d && { ...d, goals: [...d.goals, { id: `a-${Date.now().toString(36)}-${d.goals.length}`, side, time_s: null, added: true, scorer: "", keeper: "" }] });
  const setKeeper = (i: number, patch: Partial<Draft["keepers"][number]>) => setDraft((d) => d && { ...d, keepers: d.keepers.map((k, j) => (j === i ? { ...k, ...patch } : k)) });

  const when = (g: { time_s: number | null }) => g.time_s === null ? <span className="w-14 text-xs text-fg-subtle">Added</span>
    : onSeek ? <button type="button" className="w-14 text-left text-xs text-pin underline-offset-2 hover:underline" aria-label={`Watch goal at ${formatClock(g.time_s)}`} onClick={() => onSeek(g.time_s!)}>{formatClock(g.time_s)}</button>
    : <span className="w-14 text-xs text-pin">{formatClock(g.time_s)}</span>;
  const status = (g: Goal) => g.confirmed ? null : g.scorer ? <Tag>Likely</Tag> : null;

  return <section aria-label="Goals and keepers" className="panel space-y-4 p-5">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="mr-auto flex items-center gap-2 text-xl font-semibold"><GoalIcon size={18} className="text-accent" aria-hidden /> Goals and keepers</h2>
      <span className="text-sm text-fg-muted">{ours.length} scored · {theirs.length} conceded</span>
    </div>
    {draft ? <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) submit(); }}>
      <datalist id={listId}>{names.map((n) => <option key={n} value={n} />)}</datalist>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Our goals</legend>
        {draft.goals.filter((g) => g.side === "ours").map((g, i) => <div key={g.id} className="flex flex-wrap items-center gap-2">
          {when(g)}
          <input className="field w-auto flex-1" list={listId} aria-label={`Scorer, our goal ${i + 1}`} placeholder="Who scored" maxLength={80} value={g.scorer} onChange={(e) => setGoal(g.id, { scorer: e.target.value })} />
          <Button type="button" variant="ghost" aria-label={`Remove our goal ${i + 1}`} onClick={() => removeGoal(g)}><Trash2 size={14} /></Button>
        </div>)}
        <Button type="button" variant="ghost" onClick={() => addGoal("ours")}><Plus size={14} /> Add one of our goals</Button>
      </fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Keepers</legend>
        {draft.keepers.map((k, i) => <div key={i} className="flex flex-wrap items-center gap-2">
          <input className="field w-auto flex-1" list={listId} aria-label={`Keeper ${i + 1} name`} placeholder="Keeper" maxLength={80} value={k.name} onChange={(e) => setKeeper(i, { name: e.target.value })} />
          <input className="field w-20 text-center" inputMode="numeric" maxLength={2} aria-label={`Keeper ${i + 1} saves`} placeholder="Saves" value={k.saves} onChange={(e) => setKeeper(i, { saves: e.target.value })} />
          <Button type="button" variant="ghost" aria-label={`Remove keeper ${i + 1}`} onClick={() => setDraft((d) => d && { ...d, keepers: d.keepers.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
        </div>)}
        {draft.keepers.length < 10 && <Button type="button" variant="ghost" onClick={() => setDraft((d) => d && { ...d, keepers: [...d.keepers, { name: "", saves: "" }] })}><Plus size={14} /> Add a keeper</Button>}
      </fieldset>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold">Goals conceded</legend>
        {draft.goals.filter((g) => g.side === "theirs").map((g, i) => <div key={g.id} className="flex flex-wrap items-center gap-2">
          {when(g)}
          <select className="field w-auto flex-1" aria-label={`Keeper beaten, goal conceded ${i + 1}`} value={g.keeper} onChange={(e) => setGoal(g.id, { keeper: e.target.value })}>
            <option value="">First keeper</option>
            {draft.keepers.filter((k) => k.name.trim()).map((k) => <option key={k.name} value={k.name.trim()}>{k.name.trim()}</option>)}
          </select>
          <Button type="button" variant="ghost" aria-label={`Remove goal conceded ${i + 1}`} onClick={() => removeGoal(g)}><Trash2 size={14} /></Button>
        </div>)}
        <Button type="button" variant="ghost" onClick={() => addGoal("theirs")}><Plus size={14} /> Add a goal conceded</Button>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={!valid || save.isPending}>Save</Button>
        <Button type="button" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
        {!valid && <span role="alert" className="text-sm text-danger">Saves must be a number up to 99.</span>}
      </div>
    </form> : <>
      <div className="grid gap-4 md:grid-cols-2">
        <div><h3 className="mb-2 text-sm font-semibold">Our goals</h3>
          {ours.length ? <ul aria-label="Our goals" className="space-y-1.5">{ours.map((g) => <li key={g.id} className="flex items-center gap-2 text-sm">
            {when(g)}<span className={g.scorer ? "" : "text-fg-subtle"}>{g.scorer ?? "Scorer not set"}</span>{status(g)}
          </li>)}</ul> : <p className="text-sm text-fg-subtle">No goals listed.</p>}</div>
        <div><h3 className="mb-2 text-sm font-semibold">Keepers</h3>
          {data.keepers.length ? <ul aria-label="Keepers" className="space-y-1.5">{data.keepers.map((k, i) => <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <span className={k.name ? "font-medium" : "text-fg-subtle"}>{k.name ?? "Keeper not named"}</span>
            <span className="text-fg-muted">{savesText(k)}</span>{!k.confirmed && (k.name || k.saves !== null) && <Tag>Likely</Tag>}
          </li>)}</ul> : <p className="text-sm text-fg-subtle">No keeper listed.</p>}
          {theirs.length > 0 && <ul aria-label="Goals conceded" className="mt-3 space-y-1.5">{theirs.map((g) => <li key={g.id} className="flex items-center gap-2 text-sm text-fg-muted">
            {when(g)}<span>Conceded{g.keeper && data.keepers.length > 1 ? `, ${g.keeper} in goal` : ""}</span>
          </li>)}</ul>}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={start}>Edit goals and keepers</Button>
        {entry && <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate({ id: match.id, entry: null })}>Use the guess</Button>}
      </div>
      <p className="text-xs text-fg-subtle">{match.source === "veo" || match.team_data
        ? "Veo records goals and their times but no names. Add the scorers and keeper; reports show only what you save."
        : "Likely names are a guess from the players tagged at each goal, and saves from the opposition's shots on target. Check and save to confirm; reports show only what you save."}</p>
    </>}
    {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
  </section>;
}
