import { Goal as GoalIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatClock } from "../../lib/format";
import { type Goal, type GoalsEntry, type GoalsSource, type Keeper, type Spell, matchGoals, useGoalEntries, useSaveGoals } from "../../lib/goals";
import { Button } from "../ui/Button";
import { Card, Figure, Ring, StatsHeader } from "./statsUi";
import { THEIRS } from "../../lib/teamColours";

type DraftGoal = { id: string; side: "ours" | "theirs"; time_s: number | null; added: boolean; scorer: string; keeper: string };
type Draft = { goals: DraftGoal[]; removed: string[]; keepers: { name: string; saves: string }[] };

const Tag = ({ children }: { children: string }) =>
  <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-subtle">{children}</span>;

function savesText(k: Keeper): string {
  const saves = k.saves === null ? "Saves not counted" : `${k.saves} save${k.saves === 1 ? "" : "s"}`;
  return `${saves} · ${k.conceded} conceded`;
}

/** When a keeper was in goal, from the likely spells; only worth saying when there was a change. */
function spellText(name: string | null, spells: Spell[]): string | null {
  if (!name || spells.length < 2) return null;
  const mine = spells.filter((s) => s.name.toUpperCase() === name.toUpperCase());
  if (!mine.length) return null;
  return `In goal ${mine.map((s) => (s.from_s === 0 ? `to ${formatClock(s.to_s ?? 0)}`
    : s.to_s === null ? `from ${formatClock(s.from_s)}` : `${formatClock(s.from_s)} to ${formatClock(s.to_s)}`)).join(", ")}`;
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

  const counted = data.keepers.filter((k) => k.saves !== null);
  const saves = counted.length ? counted.reduce((n, k) => n + k.saves!, 0) : null;
  // Owner request 2026-11-27: titled Goals & Keepers, in the Match stats look.
  return <section aria-label="Goals and keepers" className="panel space-y-6 p-5">
    <StatsHeader icon={<GoalIcon size={18} className="text-accent" aria-hidden />} title="Goals & Keepers" sub="Who scored, who kept goal">
      <span className="text-sm text-fg-muted">{ours.length} scored · {theirs.length} conceded</span>
    </StatsHeader>
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
            <option value="">Keeper not assigned</option>
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
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Figure name="Scored" value={ours.length} note={`${ours.filter((g) => g.scorer).length} with a scorer named`} />
        <Figure name="Conceded" value={theirs.length} glow={THEIRS} note={`${theirs.filter((g) => g.keeper).length} with the keeper named`} />
        <Figure name="Saves" value={saves ?? "–"} note={saves === null ? "Not counted" : `By ${counted.length} ${counted.length === 1 ? "keeper" : "keepers"}`} />
        <Figure name="Keepers" value={data.keepers.filter((k) => k.name).length} note={data.spells.length > 1 ? "Changed during the match" : "In goal this match"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Our goals" sub="Scorers · select a time to watch">
          {ours.length ? <ul aria-label="Our goals" className="space-y-2">{ours.map((g) => <li key={g.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-sm">
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_10px_rgb(34_211_238/0.8)]" />
            {when(g)}<span className={g.scorer ? "font-medium" : "text-fg-subtle"}>{g.scorer ?? "Scorer not set"}</span>{status(g)}
          </li>)}</ul> : <p className="text-sm text-fg-subtle">No goals listed.</p>}
        </Card>
        <Card title="Keepers" sub="Saves and goals conceded">
          {data.keepers.length ? <>
            <ul aria-label="Keepers" className="space-y-2">{data.keepers.map((k, i) => <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-sm">
              <span className={k.name ? "font-medium" : "text-fg-subtle"}>{k.name ?? "Keeper not named"}</span>
              <span className="text-fg-muted">{savesText(k)}</span>
              {spellText(k.name, data.spells) && <span className="text-fg-muted">{spellText(k.name, data.spells)}</span>}{!k.confirmed && (k.name || k.saves !== null) && <Tag>Likely</Tag>}
            </li>)}</ul>
            {data.keepers.some((k) => k.saves !== null && k.saves + k.conceded > 0) && <div className="mt-5 flex flex-wrap justify-center gap-8">
              {data.keepers.filter((k) => k.saves !== null && k.saves + k.conceded > 0).map((k, i) =>
                <Ring key={i} size="h-28 w-28" label={`${k.name ?? "Keeper"} save rate`} colour="ours"
                  value={Math.round((k.saves! / (k.saves! + k.conceded)) * 100)} note={`${k.saves} of ${k.saves! + k.conceded} shots faced`} />)}
            </div>}
          </> : <p className="text-sm text-fg-subtle">No keeper listed.</p>}
          {theirs.length > 0 && <ul aria-label="Goals conceded" className="mt-4 space-y-1.5">{theirs.map((g) => <li key={g.id} className="flex items-center gap-2 text-sm text-fg-muted">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: THEIRS }} />
            {when(g)}<span>Conceded{g.keeper ? (data.keepers.length > 1 ? `, ${g.keeper} in goal` : "") : ", keeper not assigned"}</span>
          </li>)}</ul>}
        </Card>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={start}>Edit goals and keepers</Button>
        {entry && <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate({ id: match.id, entry: null })}>Use the guess</Button>}
      </div>
      <p className="text-xs text-fg-subtle">{match.source === "veo" || match.team_data
        ? "Veo records goals and their times but no names. Add the scorers and keeper; reports show only what you save."
        : "Likely names are a guess: scorers from the player tagged as the ball goes in, keepers from the player tagged at our goal kicks and at the opposition's shots on target in each period (including returning keepers; uncertain periods stay unassigned), and saves from the opposition's shots on target. Keeper times and save counts are estimates. Check and save to confirm; reports show only what you save."}</p>
    </>}
    {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
  </section>;
}
