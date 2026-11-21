import { useState } from "react";
import { Button } from "../ui/Button";
import { codeKey } from "../../lib/codes";
import { usePlayerMinutes, useSavePlayerMinutes } from "../../lib/playerMinutes";

export function PlayerMinutes({ matchId, name, estimate = null }: { matchId: string; name: string; estimate?: number | null }) {
  const minutes = usePlayerMinutes(matchId), save = useSavePlayerMinutes(matchId);
  const value = minutes.data?.[codeKey(name)];
  const [editing, setEditing] = useState(false), [draft, setDraft] = useState("");
  return <div className="mb-3 rounded-lg border border-line px-3 py-2">
    <button type="button" aria-label={`Edit minutes for ${name}`} className="flex w-full flex-wrap items-center gap-2 text-left"
      onClick={() => { setDraft(value === undefined ? "" : String(value)); setEditing(true); save.reset(); }}>
      <span className="font-semibold tabular-nums">{value ?? (estimate === null ? "—" : `≈${estimate}`)}</span><span className="text-xs text-fg-muted">Minutes played</span>
      <span className="ml-auto text-xs text-accent">{value === undefined ? estimate === null ? "Add minutes" : "Estimated · correct" : "Edit · confirmed"}</span>
    </button>
    {value === undefined && estimate !== null && <p className="mt-1 text-xs text-fg-muted">Estimated from first to last player tag in each period, excluding known keeper spells. Substitutions and untagged time may change actual minutes; without period tags, breaks may be included.</p>}
    {editing && <form className="mt-3 space-y-2" onSubmit={async e => {
      e.preventDefault();
      const number = draft.trim() === "" ? null : Number(draft);
      if (number !== null && (!Number.isFinite(number) || number < 0 || number > 600)) return;
      try { await save.mutateAsync({ player: name, minutes: number }); setEditing(false); } catch { /* Mutation error is shown below. */ }
    }}>
      <p className="text-xs text-fg-muted">Confirm actual playing time. Clip lengths are not minutes played. Leave blank to clear.</p>
      <div className="flex flex-wrap gap-2">
        <input type="number" className="field w-28" aria-label={`Minutes played for ${name}`} min={0} max={600} step="0.1" value={draft} onChange={e => setDraft(e.target.value)} />
        <Button type="submit" variant="primary" disabled={save.isPending}>Save minutes</Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      {save.error && <p role="alert" className="text-xs text-danger">{save.error.message}</p>}
    </form>}
    {minutes.error && <p className="mt-1 text-xs text-warn">Saved minutes unavailable.</p>}
  </div>;
}
