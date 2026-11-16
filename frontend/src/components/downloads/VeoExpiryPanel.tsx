import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useDownloadIndex } from "../../api/hudl";
import { useVeoLibrary } from "../../api/veo";
import { fixtureDate, ukDate } from "../../lib/hudlFixture";
import { type AtRisk, type Band, veoExpiryQueue } from "../../lib/veoExpiryQueue";

const KEY = "fm.veo.retentionMonths";
const TONE: Record<Band, string> = {
  "7": "bg-danger/15 text-danger", "30": "bg-warn/15 text-warn", "60": "bg-warn/10 text-warn",
  later: "bg-white/5 text-fg-muted", unknown: "bg-white/5 text-fg-muted",
};

function readMonths(): number {
  try { return localStorage.getItem(KEY) === "6" ? 6 : 12; } catch { return 12; }
}

const shortTitle = (title: string) => title.replace(/^\d{6}\s+/, "");

function left(row: AtRisk): string {
  if (row.daysLeft === null) return row.band === "30" ? "Veo says it expires soon" : "no date in the title";
  if (row.daysLeft < 0) return "past the estimate";
  return `about ${row.daysLeft} ${row.daysLeft === 1 ? "day" : "days"} left`;
}

/** Spec 280: Veo matches with video that are not saved yet, soonest to expire first.
 *  Reads only the helper's cached Veo list and the download index; no Veo request. */
export function VeoExpiryPanel({ today }: { today?: Date }) {
  const library = useVeoLibrary();
  const index = useDownloadIndex();
  const [months, setMonths] = useState(readMonths);
  if (!library.data?.length) return null;
  const queue = veoExpiryQueue(library.data, index.data ?? [], months, today ?? new Date());
  const choose = (value: number) => {
    setMonths(value);
    try { localStorage.setItem(KEY, String(value)); } catch { /* the choice still applies until reload */ }
  };

  return (
    <section aria-label="Before Veo deletes them" className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-800 text-warn"><CalendarClock size={20} aria-hidden /></span>
        <div className="min-w-[12rem] flex-1">
          <p className="font-semibold">Before Veo deletes them</p>
          <p className="text-xs text-fg-muted">
            {queue.atRisk.length ? `${queue.atRisk.length} Veo ${queue.atRisk.length === 1 ? "match" : "matches"} with video not saved here` : "Every Veo match with video is saved here"}
            {` · ${queue.saved} saved`}. Days left are estimated from the match date; Veo does not publish the exact day.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          Veo keeps video for
          <select value={months} onChange={(e) => choose(Number(e.target.value))}
            className="rounded-lg border border-line bg-ink-900 px-2 py-1 text-sm text-fg">
            <option value="12">12 months</option>
            <option value="6">6 months</option>
          </select>
        </label>
      </div>
      {queue.atRisk.length > 0 && (
        <ul aria-label="Not saved yet" className="grid gap-2 sm:grid-cols-2">
          {queue.atRisk.map((row) => (
            <li key={row.match.id} className="tile flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link to={`/veo/${encodeURIComponent(row.match.id)}`} className="block truncate text-sm font-medium hover:text-accent">
                  {shortTitle(row.match.title)}
                </Link>
                <p className="text-xs text-fg-subtle">{row.date ? ukDate(row.date) : "Date unknown"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${TONE[row.band]}`}>{left(row)}</span>
            </li>
          ))}
        </ul>
      )}
      {queue.lost.length > 0 && (
        <details className="text-xs text-fg-muted">
          <summary className="cursor-pointer">Expired on Veo before they were saved ({queue.lost.length})</summary>
          <ul className="mt-2 columns-1 gap-4 sm:columns-2">
            {queue.lost.map((m) => {
              const date = fixtureDate(m.title);
              return <li key={m.id} className="truncate py-0.5">{shortTitle(m.title)}{date ? ` · ${ukDate(date)}` : ""}</li>;
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
