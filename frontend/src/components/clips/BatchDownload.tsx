import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Files, Film, FolderArchive, Layers } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type HudlMatch, downloadState, hudlBlocked, hudlRequest, useDownloadIndex, useHudlStatus } from "../../api/hudl";
import { fixtureDate, fixtureParts, latestFirst, ukDate } from "../../lib/hudlFixture";
import { looksLikePlayer } from "../../lib/hudlPlayer";
import { timeLeft } from "../../lib/taggedPlayback";
import { Button } from "../ui/Button";

type Output = "zip" | "mp4" | "reel" | "reels";
const OUTPUTS: { id: Output; label: string; hint: string; icon: typeof Film }[] = [
  { id: "zip", label: "ZIP per match", hint: "One video per moment, grouped by match", icon: FolderArchive },
  { id: "mp4", label: "One video per match", hint: "Each match's moments back to back", icon: Film },
  { id: "reel", label: "One highlight reel", hint: "Every match, with an animated title card before each", icon: Clapperboard },
  { id: "reels", label: "One reel per match", hint: "Each match in its own file, with its animated title card", icon: Files },
];

/** Spec 190: one player's (or code's) moments from many matches in one go. The helper
 *  works through the matches one at a time and saves into the moments folder. */
export function BatchDownload({ matches }: { matches: HudlMatch[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const status = useHudlStatus();
  const saved = downloadState(useDownloadIndex().data);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<Output>("zip");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  const codes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) for (const c of new Set((m.moments ?? []).map((t) => t.category))) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts].sort((a, b) => Number(looksLikePlayer(b[0])) - Number(looksLikePlayer(a[0])) || b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [matches]);
  const rows = useMemo(() => latestFirst(matches)
    .map((m) => ({ m, count: (m.moments ?? []).filter((t) => t.category === code).length }))
    .filter((r) => code && r.count > 0), [matches, code]);

  // New choice of player: tick every match whose moments are not downloaded yet.
  useEffect(() => {
    if (!touched) setChosen(new Set(rows.filter((r) => !saved.get(r.m.id)?.moments).map((r) => r.m.id)));
  }, [rows, saved.size, touched]);

  const picked = rows.filter((r) => chosen.has(r.m.id));
  const total = picked.reduce((n, r) => n + r.count, 0);
  const items = picked.map((r) => ({ match_id: r.m.id, codes: [code] }));
  const start = useMutation({
    mutationFn: () => hudlRequest("/account/batch", { items, combined: output === "mp4" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hudl-account"] }),
  });
  const running = status.data?.busy && !status.data.syncing && !status.data.match_id;
  const progress = status.data?.progress;

  const toggle = (id: string) => {
    setTouched(true);
    setChosen((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <section aria-label="Batch download" className="panel space-y-4 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Layers size={18} className="text-accent" aria-hidden /> Batch download moments</h2>
          <p className="mt-1 text-sm text-fg-muted">Pick a player or code and every match they are tagged in. Matches are fetched one at a time and saved in the moments folder.</p>
        </div>
        <label className="text-xs text-fg-muted">Player or code
          <select aria-label="Player or code" className="field mt-1 min-w-56" value={code} onChange={(e) => { setCode(e.target.value); setTouched(false); }}>
            <option value="">Choose…</option>
            {codes.map(([c, n]) => <option key={c} value={c}>{c} ({n} {n === 1 ? "match" : "matches"})</option>)}
          </select>
        </label>
      </div>
      {code && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>{picked.length} of {rows.length} matches selected</span>
              <span className="flex gap-3">
                <button type="button" className="text-accent hover:underline" onClick={() => { setTouched(true); setChosen(new Set(rows.map((r) => r.m.id))); }}>All</button>
                <button type="button" className="text-accent hover:underline" onClick={() => { setTouched(true); setChosen(new Set()); }}>None</button>
              </span>
            </div>
            <ul aria-label="Matches to include" className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {rows.map(({ m, count }) => {
                const date = fixtureDate(m.title);
                const name = fixtureParts(m.title)?.opponent ?? m.title;
                const done = saved.get(m.id)?.moments;
                return (
                  <li key={m.id}>
                    <label className="tile flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:border-accent/50">
                      <input type="checkbox" checked={chosen.has(m.id)} onChange={() => toggle(m.id)} aria-label={`${name}${date ? `, ${ukDate(date)}` : ""}`} />
                      <span className="min-w-0 flex-1 truncate">{name}<span className="ml-2 text-xs text-fg-subtle">{date ? ukDate(date) : m.title}</span></span>
                      {done && <span className="rounded-full bg-pin/15 px-2 py-0.5 text-[11px] text-pin">downloaded</span>}
                      <span className="text-xs text-fg-muted tabular-nums">{count}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-3">
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs text-fg-muted">Save as</legend>
              {OUTPUTS.map(({ id, label, hint, icon: Icon }) => (
                <label key={id} className={`tile flex cursor-pointer items-start gap-3 p-3 ${output === id ? "border-accent/70 bg-accent/5" : ""}`}>
                  <input type="radio" name="batch-output" className="sr-only" checked={output === id} onChange={() => setOutput(id)} aria-label={`${label}: ${hint}`} />
                  <Icon size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                  <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-fg-muted">{hint}</span></span>
                </label>
              ))}
            </fieldset>
            {output === "reel" || output === "reels" ? (
              <Button variant="primary" className="w-full" disabled={!picked.length}
                onClick={() => navigate("/clips/reel/new", { state: { name: `${code} highlights`, ...(output === "reels" ? { per_match: true } : {}), items } })}>
                <Clapperboard size={15} aria-hidden /> {output === "reels" ? `Create ${picked.length} highlight ${picked.length === 1 ? "reel" : "reels"}` : "Create highlight reel"}
              </Button>
            ) : (
              <Button variant="primary" className="w-full" disabled={!picked.length || start.isPending || hudlBlocked(status.data)} onClick={() => start.mutate()}>
                Download {total} {total === 1 ? "moment" : "moments"} from {picked.length} {picked.length === 1 ? "match" : "matches"}
              </Button>
            )}
            {start.isError && <p role="alert" className="text-sm text-danger">{start.error.message}</p>}
          </div>
        </div>
      )}
      {running && progress && (
        <div className="space-y-2" role="status" aria-label="Batch progress">
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{progress.label}</span><span className="text-fg-muted">{Math.round(progress.fraction * 100)}% · {timeLeft(progress.eta_s)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-ok to-accent transition-[width]" style={{ width: `${Math.max(2, progress.fraction * 100)}%` }} /></div>
        </div>
      )}
      {!running && status.data?.state === "done" && !status.data.match_id && status.data.message && <p role="status" className="text-sm text-ok">{status.data.message} See <a className="underline" href="/downloaded">Downloaded</a>.</p>}
    </section>
  );
}
