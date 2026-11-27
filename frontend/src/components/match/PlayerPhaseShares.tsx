import type { PhaseKey, PhaseShare } from "../../lib/phaseInvolvement";
import { GradientBar } from "./statsUi";

/** Spec 810: share of a player's clips while the team was tagged in each phase. A share of the
 * player's own clips (0-100%), so every player is read on the same scale. */
export function PlayerPhaseShares({ phases, selected, onSelect }: {
  phases: PhaseShare[]; selected?: PhaseKey; onSelect: (key: PhaseKey) => void;
}) {
  if (!phases.length) return null;
  return <div className="mt-5 min-w-0 border-t border-line pt-4">
    <p className="mb-3 text-xs text-fg-muted">Team phases · share of this player’s clips</p>
    <div className="space-y-3">
      {phases.map(p => {
        const percent = Math.round(p.share * 100);
        return <div key={p.key} className="grid grid-cols-[minmax(6.5rem,8.5rem)_minmax(2rem,1fr)_3rem] items-center gap-3">
          <button type="button" aria-label={`${p.label}: ${percent}% of clips`} aria-pressed={selected === p.key} onClick={() => onSelect(p.key)}
            className={`min-w-0 rounded-md px-1 py-1 text-left hover:bg-accent/10 ${selected === p.key ? "bg-accent/15 text-accent" : "text-fg"}`}>
            <span className="block text-sm">{p.label}</span>
            <span className="block text-xs text-fg-muted">{p.clips.length} of {p.total} clips</span>
          </button>
          <GradientBar value={p.share} max={1} />
          <span className="text-right text-sm font-semibold tabular-nums">{percent}%</span>
        </div>;
      })}
    </div>
    <p className="mt-3 text-xs text-fg-subtle">A clip counts when at least half of it falls inside the team’s phase tag. Involvement, not an action by the player.</p>
  </div>;
}
