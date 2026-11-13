import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useHudlLibrary } from "../api/hudl";
import { newAlerts, snapshot } from "../lib/alerts";
import { usePrimaryPlayerName } from "../lib/usePrimaryPlayerName";
import { useAlertsSeen, useSaveAlertsSeen } from "../lib/viewerState";

/** Spec 230: new matches and new moments of your player since you last looked. The first
 *  time the app runs it records the library as already seen, so nothing old is "new". */
export function AlertsBell() {
  const library = useHudlLibrary();
  const seen = useAlertsSeen();
  const save = useSaveAlertsSeen();
  const { name, ready } = usePrimaryPlayerName();
  const [open, setOpen] = useState(false);
  const started = useRef(false);
  const loaded = library.isSuccess && seen.isSuccess && ready;
  useEffect(() => {
    if (loaded && seen.data === null && !started.current && library.data.length) {
      started.current = true;
      save.mutate(snapshot(library.data, name));
    }
  }, [loaded, seen.data, library.data, name]);
  if (!loaded) return null;
  const alerts = newAlerts(seen.data, library.data, name);
  const markRead = () => { save.mutate(snapshot(library.data, name)); setOpen(false); };
  return (
    <div className="relative">
      <button type="button" aria-label={alerts.length ? `${alerts.length} new ${alerts.length === 1 ? "alert" : "alerts"}` : "No new alerts"} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="relative grid h-11 w-11 place-items-center rounded-full border border-line bg-ink-800/80 text-fg-muted hover:text-fg">
        <Bell size={18} aria-hidden />
        {alerts.length > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-pin px-1 text-[11px] font-semibold text-ink-900">{alerts.length > 99 ? "99+" : alerts.length}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Alerts" className="panel absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] space-y-3 p-4 shadow-xl">
          <h2 className="text-sm font-semibold">What's new</h2>
          {alerts.length === 0 ? <p className="text-sm text-fg-muted">Nothing new since you last looked.</p> : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {alerts.map((a) => (
                <li key={`${a.kind}${a.id}`}>
                  <Link to={`/hudl/${encodeURIComponent(a.id)}${name && a.count ? `?player=${encodeURIComponent(name)}` : ""}`} onClick={() => setOpen(false)} className="tile block p-2.5 text-sm hover:border-accent/60">
                    <span className="block text-xs text-pin">{a.kind === "match" ? "New match" : `${a.count} new ${a.count === 1 ? "moment" : "moments"} of ${name}`}</span>
                    <span className="block truncate">{a.title}</span>
                    {a.kind === "match" && name && a.count > 0 && <span className="block text-xs text-fg-muted">{name} tagged {a.count} times</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {alerts.length > 0 && <button type="button" className="text-xs text-accent hover:underline" onClick={markRead}>Mark all as read</button>}
        </div>
      )}
    </div>
  );
}
