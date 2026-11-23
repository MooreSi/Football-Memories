import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { taggedScore } from "../../lib/matchScore";
import { Trophy, X } from "lucide-react";
import { useTournaments, useSaveTournament, useRemoveTournamentGame, useRenameTournament } from "../../api/tournaments";
import { tournamentStats, type TournamentGame } from "../../lib/tournaments";
import { Button } from "../ui/Button";
import { Overlay } from "../ui/Overlay";

type State = {
  selected: Set<string>; toggle: (key: string) => void; clear: () => void;
  tournamentId: string; setTournamentId: (id: string) => void;
  team: string; setTeam: (team: string) => void;
  includes: (key: string) => boolean;
  memberships: Set<string>;
  editing: string | null; edit: (key: string | null) => void;
  select: (keys: string[]) => void;
  compact: boolean; assigning: boolean; assign: (open: boolean) => void;
  renaming: string | null; rename: (id: string | null) => void;
};
const Context = createContext<State | null>(null);
export function useTournamentSelection() { return useContext(Context); }

export function TournamentProvider({children, compact = false}: {children: ReactNode; compact?: boolean}) {
  const [assigning, assign] = useState(false);
  const [selected, setSelected] = useState(new Set<string>());
  const [tournamentId, setId] = useState("");
  const [team, setTeam] = useState("");
  const [renaming, rename] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const tournaments = useTournaments();
  const active = tournaments.data?.find(t => t.id === tournamentId);
  return <Context.Provider value={{selected, toggle: key => setSelected(previous => {
    const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next;
  }), clear: () => setSelected(new Set()), tournamentId, setTournamentId: id => {setId(id); setTeam("");}, team, setTeam,
  editing, edit: key => {setEditing(key); if (key) setSelected(new Set([key]));},
  select: keys => setSelected(new Set(keys)), renaming, rename,
  compact, assigning, assign,
  memberships: new Set(Object.keys(active?.entries ?? {})),
  includes: key => !tournamentId || Boolean(active?.entries[key] && (!team || active.entries[key] === team)),
  }}>{children}</Context.Provider>;
}

/** Outside the card link so ticking a match never starts playback. */
export function TournamentSelect({matchKey, title}: {matchKey: string; title: string}) {
  const state = useTournamentSelection();
  const tournaments = useTournaments();
  if (!state) return null;
  const memberships = tournaments.data?.filter(t => t.entries[matchKey]) ?? [];
  if (state.compact) return <div className="grouped-match-actions">
    {memberships.length > 0 && <Button variant="ghost" className="text-xs" aria-label={`Correct tournament for ${title}`} onClick={() => state.edit(matchKey)}>Edit</Button>}
    <label className="grouped-game-select"><input type="checkbox" aria-label={`Select ${title} for tournament`} checked={state.selected.has(matchKey)} onChange={() => state.toggle(matchKey)} /><span>Select</span></label>
  </div>;
  return <div className="tournament-card-footer border-t border-line px-4 py-3 text-xs">
    {memberships.map(t => <div key={t.id} className="tournament-membership min-w-0 space-y-1 text-fg-muted">
      <p className="tournament-name font-medium">{t.name}</p><p>{t.entries[matchKey]}</p>
      {t.automatic?.[matchKey] ? <details className="text-fg-subtle">
        <summary aria-label={`${t.automatic[matchKey].confidence === "review" ? "Auto, needs review" : "Auto"}. Why grouped?`} className="cursor-pointer"><span className="mr-2 text-accent">{t.automatic[matchKey].confidence === "review" ? "Auto · Review" : "Auto"}</span>Why grouped?</summary>
        <p className="mt-1">{t.automatic[matchKey].reason}</p>
      </details> : <span className="ml-2 text-fg-subtle">Manual</span>}
      <Button className="text-xs" variant="ghost" aria-label={`Rename tournament ${t.name}`} onClick={() => state.rename(t.id)}>Rename</Button>
    </div>)}
    <div className="tournament-card-actions">
    {memberships.length > 0 && <Button className="text-xs" variant="ghost" aria-label={`Correct tournament for ${title}`} onClick={() => state.edit(matchKey)}>Correct</Button>}
    <label className="tournament-select cursor-pointer rounded-lg border border-line px-3 py-2 text-fg-muted hover:text-fg">
      <input type="checkbox" className="size-4 accent-accent" aria-label={`Select ${title} for tournament`}
        checked={state.selected.has(matchKey)} onChange={() => state.toggle(matchKey)} /> Add to tournament
    </label>
    </div>
  </div>;
}

export function TournamentTools({games, eligibleKeys, scopeLoading = false, loading = false, scoreError = false, compact = false}: {compact?: boolean; games: TournamentGame[]; eligibleKeys?: string[]; scopeLoading?: boolean; loading?: boolean; scoreError?: boolean}) {
  const state = useTournamentSelection()!;
  const tournaments = useTournaments();
  const remove = useRemoveTournamentGame();
  const [open, setOpen] = useState(false);
  const renaming = tournaments.data?.find(t => t.id === state.renaming);
  const allowed = eligibleKeys ? new Set(eligibleKeys) : null;
  const choices = tournaments.data?.filter(t => !allowed || Object.keys(t.entries).some(key => allowed.has(key))) ?? [];
  useEffect(() => {
    if (!scopeLoading && tournaments.isSuccess && state.tournamentId && !choices.some(t => t.id === state.tournamentId)) state.setTournamentId("");
  }, [eligibleKeys, scopeLoading, tournaments.data, state.tournamentId]);
  const rename = useRenameTournament();
  const [notice, setNotice] = useState("");
  const active = tournaments.data?.find(t => t.id === state.tournamentId);
  const correctionGroup = state.editing ? tournaments.data?.find(t => t.entries[state.editing!]) : undefined;
  const dialogOpen = open || Boolean(state.editing) || state.assigning;
  const localKeys = Object.keys(active?.entries ?? {}).filter(key => key.startsWith("local:")).sort();
  const localScores = useQuery({
    queryKey: ["tournament-local-scores", localKeys],
    enabled: !compact && localKeys.length > 0,
    retry: false,
    queryFn: async () => {
      const out: TournamentGame[] = [];
      // Read only imported metadata, in bounded batches; no stream or helper access.
      for (let i = 0; i < localKeys.length; i += 4) {
        out.push(...await Promise.all(localKeys.slice(i, i+4).map(async key => {
          const match = await api.match(Number(key.slice(6)));
          return {key, score: taggedScore(match.events.map(event => ({...event, id: String(event.id)})), match.team_name)};
        })));
      }
      return out;
    },
  });
  const teams = [...new Set(Object.values(active?.entries ?? {}))].sort();
  const rows = active ? tournamentStats(active, [...games, ...(localKeys.length ? localScores.data ?? [] : [])]).filter(row => !state.team || row.team === state.team) : [];
  const total = rows.reduce((n,r) => n+r.games, 0);
  const scored = rows.reduce((n,r) => n+r.scored, 0);
  const unscored = total-scored;
  return <div className={compact ? "grouped-tournament-dialogs" : "mb-5 space-y-4 rounded-xl border border-line bg-ink-950/20 p-4"}>
    {!compact && <div className="tournament-toolbar">
      <h3 className="mr-auto flex items-center gap-2 text-sm font-semibold"><Trophy size={16} className="text-accent" />Tournaments</h3>
      <label className="min-w-0 max-w-full text-xs text-fg-muted">Tournament<select aria-label="Tournament" className="field mt-1 max-w-full" value={state.tournamentId} onChange={e => state.setTournamentId(e.target.value)}>
        <option value="">All tournaments</option>{choices.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select></label>
      {active && <label className="min-w-0 max-w-full text-xs text-fg-muted">Entered team<select aria-label="Tournament team" className="field mt-1 max-w-full" value={state.team} onChange={e => state.setTeam(e.target.value)}>
        <option value="">All entered teams</option>{teams.map(team => <option key={team}>{team}</option>)}
      </select></label>}
      <Button disabled={!state.selected.size || !tournaments.isSuccess} onClick={() => setOpen(true)}>Add to tournament ({state.selected.size})</Button>
      {state.selected.size > 0 && <Button variant="ghost" onClick={state.clear}>Clear selection</Button>}
    </div>}
    {!compact && tournaments.isPending && <p role="status" className="text-xs text-fg-muted">Loading tournaments…</p>}
    {tournaments.isError && <div role="alert" className="text-sm text-danger">Could not load tournaments. <Button onClick={() => void tournaments.refetch()}>Retry tournaments</Button></div>}
    {!compact && !active && <p className="text-xs text-fg-subtle">Named tournaments and days with at least three games against multiple opponents are grouped automatically. Ordinary weekend pairs stay separate. Review automatic labels or tick games to set a tournament and entered home team yourself.</p>}
    {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
    {!compact && active && <section aria-label="Tournament stats" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><Button variant="ghost" onClick={() => state.rename(active.id)}>Rename tournament</Button></div>
      <div><h4 className="break-words font-semibold">{active.name}{state.team ? ` · ${state.team}` : ""}</h4>
        <p className="mt-1 text-xs text-fg-muted">{scored} of {total} games have scores</p></div>
      {(loading || localScores.isFetching) && <p role="status" className="text-xs text-fg-muted">Loading tournament scores…</p>}
      {(scoreError || localScores.isError) && <p role="alert" className="text-xs text-danger">Some scores could not be loaded. Totals may be incomplete.</p>}
      <div className="space-y-3">{rows.map(row => <div key={row.team} className="rounded-xl border border-line p-3" role="group" aria-label={`${row.team} tournament stats`}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="break-words text-sm font-semibold">{row.team}</p>
          <Button className="text-xs" variant="ghost" aria-label={`Correct team ${row.team}`} onClick={() => {
            state.select(Object.keys(active.entries).filter(key => active.entries[key] === row.team));
            state.setTeam(row.team); setOpen(true);
          }}>Correct team</Button></div>
        <dl className="grid grid-cols-4 gap-3 text-center sm:grid-cols-8">{[
          ["Games", row.games], ["Wins", row.won], ["Draws", row.drawn], ["Losses", row.lost],
          ["Goals for", row.gf], ["Goals against", row.ga], ["Goal diff", row.gd], ["Scored", `${row.scored}/${row.games}`],
        ].map(([label, value]) => <div key={label}><dt className="text-[10px] text-fg-subtle">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd></div>)}</dl>
      </div>)}</div>
      <p className="text-xs text-fg-subtle">Whole tournament totals, independent of search, age and season. Results use saved corrections, Hudl goal tags or Veo scores. {unscored > 0 && `${unscored} unscored games (including unavailable matches) are excluded from results and goals.`} Entered team labels do not change which side is ours in the source score.</p>
      {state.selected.size > 0 && <Button disabled={remove.isPending || ![...state.selected].some(key => active.entries[key])} onClick={async () => {
        try {
          for (const key of state.selected) if (active.entries[key]) await remove.mutateAsync({id: active.id, key});
          state.clear(); setNotice("Selected games removed from this tournament");
        } catch { /* The mutation error remains visible below; retain selection for retry. */ }
      }}>Remove selected from this tournament</Button>}
      {remove.isError && <p role="alert" className="text-sm text-danger">{remove.error.message}</p>}
    </section>}
    {compact && active && state.selected.size > 0 && <div className="my-3">
      <Button disabled={remove.isPending || ![...state.selected].some(key => active.entries[key])} onClick={async () => {
        try {
          for (const key of state.selected) if (active.entries[key]) await remove.mutateAsync({id: active.id, key});
          state.clear(); setNotice("Selected games removed from this tournament");
        } catch { /* Retain selection so a failed request can be retried. */ }
      }}>Remove selected from this tournament</Button>
      {remove.isError && <p role="alert" className="text-sm text-danger">{remove.error.message}</p>}
    </div>}
    {state.selected.size > 0 && !dialogOpen && <div className="fixed right-4 bottom-20 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-line bg-ink-950 p-2 shadow-xl sm:bottom-4" aria-label="Selected tournament games">
      <Button variant="primary" disabled={!tournaments.isSuccess} onClick={() => setOpen(true)}>Add selected games ({state.selected.size})</Button>
      <Button variant="ghost" aria-label="Clear selected tournament games" onClick={state.clear}><X size={16} /></Button>
    </div>}
    {dialogOpen && <TournamentDialog initialName={correctionGroup?.name ?? active?.name ?? ""} initialTeam={correctionGroup?.entries[state.editing!] ?? state.team} onClose={() => {setOpen(false); state.edit(null); state.assign(false);}} onSaved={(name, team, count) => {
      state.clear(); setOpen(false); state.edit(null); state.assign(false); setNotice(`${count} games added to ${name} · ${team}`);
    }} />}
    {renaming && <Overlay label="Rename tournament" onClose={() => {if (!rename.isPending) state.rename(null);}}>
      <form className="space-y-4" onKeyDown={event => {
        if (event.key === "Escape" && !rename.isPending) state.rename(null);
        if (event.key === "Tab") {
          const fields = [...event.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)')];
          const first = fields[0], last = fields[fields.length-1];
          if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
          else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
        }
      }} onSubmit={event => {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
        if (name) rename.mutate({id: renaming.id, name}, {onSuccess: () => state.rename(null)});
      }}>
        <h2 className="font-semibold">Rename tournament</h2>
        <label className="block text-sm">New tournament name<input autoFocus name="name" className="field mt-1" defaultValue={renaming.name} maxLength={160} required /></label>
        <p className="text-xs text-fg-muted">Applies to all {Object.keys(renaming.entries).length} games and every entered team in this tournament. The name is kept when new games are grouped automatically.</p>
        {rename.isError && <p role="alert" className="text-sm text-danger">{rename.error.message}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" disabled={rename.isPending} onClick={() => state.rename(null)}>Cancel</Button><Button type="submit" disabled={rename.isPending}>Save tournament name</Button></div>
      </form>
    </Overlay>}
  </div>;
}

function TournamentDialog({initialName, initialTeam, onClose, onSaved}: {
  initialName: string; initialTeam: string; onClose: () => void; onSaved: (name: string, team: string, count: number) => void;
}) {
  const state = useTournamentSelection()!;
  const tournaments = useTournaments();
  const save = useSaveTournament();
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState(initialTeam);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    form.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => previous?.focus();
  }, []);
  const enteredTeams = [...new Set(Object.values(tournaments.data?.find(t => t.name.toLowerCase() === name.trim().toLowerCase())?.entries ?? {}))];
  return <Overlay label="Add games to tournament" onClose={() => {if (!save.isPending) onClose();}}>
    <form ref={form} className="space-y-4" onKeyDown={event => {
      if (event.key === "Escape" && !save.isPending) onClose();
      if (event.key === "Tab") {
        const elements = [...form.current!.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)')];
        const first = elements[0], last = elements[elements.length-1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
      }
    }} onSubmit={event => {
      event.preventDefault();
      save.mutate({name: name.trim(), team: team.trim(), match_keys: [...state.selected]}, {onSuccess: data => {
        const saved = data.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
        if (saved) {state.setTournamentId(saved.id); state.setTeam(saved.entries[[...state.selected][0]] ?? team.trim());}
        onSaved(saved?.name ?? name.trim(), team.trim(), state.selected.size);
      }});
    }}>
      <div className="flex items-center gap-3"><h2 className="mr-auto text-lg font-semibold">{state.editing ? "Correct tournament" : "Add to tournament"}</h2><Button type="button" variant="ghost" aria-label="Close tournament dialog" disabled={save.isPending} onClick={onClose}><X size={18} /></Button></div>
      <p className="text-sm text-fg-muted">{state.selected.size} selected {state.selected.size === 1 ? "game" : "games"}. Choose an existing name or enter a new tournament and team.</p>
      <label className="block text-sm">Tournament name<input className="field mt-1" list="tournament-names" required maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder="Winter Cup 2026" disabled={save.isPending} />
        <datalist id="tournament-names">{tournaments.data?.map(t => <option key={t.id} value={t.name} />)}</datalist></label>
      <label className="block text-sm">Entered home team<input className="field mt-1" list="tournament-team-names" required maxLength={160} value={team} onChange={e => setTeam(e.target.value)} placeholder="Villa Blue" disabled={save.isPending} />
        <datalist id="tournament-team-names">{enteredTeams.map(t => <option key={t} value={t} />)}</datalist></label>
      <p className="text-xs text-fg-subtle">Each game belongs to one entered team within this tournament. Manual corrections are kept during automatic grouping. Saving moves an automatic assignment; other manual tournament entries stay intact.</p>
      {save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={save.isPending || !name.trim() || !team.trim()}>{save.isPending ? "Saving…" : `Save ${state.selected.size} ${state.selected.size === 1 ? "game" : "games"}`}</Button></div>
    </form>
  </Overlay>;
}
