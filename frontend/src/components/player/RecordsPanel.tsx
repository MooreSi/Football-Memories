import { Crosshair, Goal, Hand, Percent, Shield, Target } from "lucide-react";
import type { HudlMatch } from "../../api/hudl";
import { useGoalEntries } from "../../lib/goals";
import { footballRecords } from "../../lib/playerRecords";

export function RecordsPanel({ library, name, position, club }: { library: HudlMatch[] | undefined; name: string; position: string | null; club: string | null }) {
  const entries = useGoalEntries();
  const records = footballRecords(library ?? [], name, position, club, entries.data ?? {});
  const icons = records.keeper ? [Hand, Shield, Crosshair, Percent] : [Goal, Target, Crosshair, Hand];
  return <section aria-label="Records and streaks" className="panel space-y-4 p-5">
    <h2 className="text-lg font-semibold">Records and streaks</h2>
    <p className="text-xs text-fg-muted">{records.keeper ? "Goalkeeping" : "Outfield"} totals across cached matches. Unrecorded stats show —; estimates and tag involvement are labelled. Imported moments alone do not supply action stats.</p>
    {entries.isError ? <p role="alert" className="text-sm text-warn">Could not load saved goals and keepers. Try refreshing to see your records.</p>
      : entries.isPending ? <p className="text-sm text-fg-muted">Loading player records…</p>
      : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {records.cards.map((card, i) => {
          const Icon = icons[i];
          return <div key={card.label} role="group" aria-label={card.label} className="tile flex min-w-0 flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-fg-muted"><span>{card.label}</span><Icon size={17} className="shrink-0 text-accent" aria-hidden /></div>
            <p className="bg-linear-to-r from-[#93c5fd] to-[#38bdf8] bg-clip-text text-3xl leading-none font-extrabold tracking-tight text-transparent tabular-nums">{card.value === null ? "—" : `${card.value.toLocaleString("en-GB")}${card.percent ? "%" : ""}`}</p>
            <p className="text-xs text-fg-muted">{card.note}</p>
          </div>;
        })}
      </div>}
  </section>;
}
