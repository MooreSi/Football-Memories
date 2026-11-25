import { useState } from "react";
import { Button } from "../ui/Button";
import type { Moment } from "./moments";
import { teamName, type Appearance, type Assignment, type Review, type Role, type Team } from "./labTypes";
import { BASE, csrfToken } from "./useLabData";
import { kitColour, type KitPrototype } from "./kits";

type Change = (change: (review: Review) => Review) => void;
const GROUP_CHOICES: { label: string; team: Team | null; role: Role | null }[] = [
  { label: "Mixed / leave", team: null, role: null }, { label: "Our players", team: "own", role: "player" },
  { label: "Opponent players", team: "opponent", role: "player" }, { label: "Referees", team: null, role: "referee" }, { label: "Not players", team: null, role: "other" },
];

export function PrepareGrouping({ jobId, sourceHash, onQueued, upgrade = false }: { jobId: string; sourceHash: string; onQueued: (id: string) => void; upgrade?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function prepare() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${BASE}/jobs/${jobId}/prepare-review`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRF-Token": await csrfToken() }, body: JSON.stringify({ source_sha256: sourceHash }) });
      if (!response.ok) throw new Error(response.status === 409 ? "Another analysis is running, or the video changed. Try again when it finishes." : "Player grouping could not be started.");
      onQueued((await response.json() as { id: string }).id);
    } catch (e) { setError(e instanceof Error ? e.message : "Player grouping could not be started."); }
    finally { setBusy(false); }
  }
  return <section className="panel space-y-3 p-4" aria-label={upgrade ? "Player view model" : "Team setup"}>
    <h2 className="font-semibold">{upgrade ? "Learn across camera views" : "Set up teams"}</h2>
    <p className="text-sm text-fg-muted">{upgrade ? "Update this older run to learn from separate front, back and shaded views. Your saved corrections carry over to the new run." : "Prepare multiple player views to apply your team and role corrections across the game. Your saved labels carry over; the original run is kept."}</p>
    <Button variant="primary" disabled={busy} onClick={() => void prepare()}>{busy ? "Starting…" : upgrade ? "Update player view model" : "Prepare player grouping"}</Button>
    {error && <p role="alert" className="text-sm text-warn">{error}</p>}
  </section>;
}

const kitName = (k: KitPrototype) => k.role === "referee" ? "Referee" : k.role === "other" ? "Not players" : `${teamName(k.team)}${k.role === "goalkeeper" ? " goalkeeper" : ""}`;

/** What your labels taught: one kit per label you used, and how many tracked people it matched. */
export function KitsLearned({ kits, remembered, teams }: { kits: KitPrototype[]; remembered: KitPrototype[]; teams: Map<number, Assignment> }) {
  if (!kits.length) return <p className="text-sm text-fg-muted">Label one player from each team on the video. The lab learns each team's kit from them and assigns everyone else wearing it, right through the clip.</p>;
  const matched = (k: KitPrototype) => [...teams.values()].filter(t => t.source === "kit" && t.team === k.team && t.role === k.role).length;
  return <div className="space-y-1" aria-label="Kits learned">
    <h3 className="text-sm font-semibold">Kits learned from your labels</h3>
    <ul className="flex flex-wrap gap-2">{kits.map((k, i) => <li key={`${k.team}|${k.role}|${i}`} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1 text-xs">
      <span className="inline-block size-4 rounded-sm border border-line" style={{ background: kitColour(k.lab) }} aria-hidden />
      <span>{kitName(k)}{remembered.includes(k) ? " · remembered from an earlier run" : ""}</span>
      <span className="tabular-nums text-fg-muted">{matched(k) ? `${matched(k)} matched by kit` : "dark kit: decided by your labels and look-alikes"}</span>
    </li>)}</ul>
  </div>;
}

export function TeamSetup({ jobId, appearance, review, update, teams, kits = [], remembered = [] }: { jobId: string; appearance: Appearance; review: Review; update: Change; teams: Map<number, Assignment>; kits?: KitPrototype[]; remembered?: KitPrototype[] }) {
  const mine = review.track_labels.filter(l => l.role === "player" || l.role === "goalkeeper");
  const tally = (team: Team) => [...teams.values()].filter(t => t.team === team && t.role !== "referee").length;
  const sprite = appearance.sprite;
  const thumbs = new Map(appearance.tracks.map(t => [t.track_id, t.thumb]));
  const setGroup = (group: number, team: Team | null, role: Role | null) => update(r => ({ ...r, group_labels: [...r.group_labels.filter(g => g.group_id !== group), ...(role ? [{ group_id: group, team, role }] : [])] }));
  return <section className="panel space-y-4 p-4" aria-label="Team setup">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="font-semibold">Set up teams</h2>
      <p className="text-sm text-fg-muted">You labelled {mine.length} players · tracked people now: {teamName("own")} {tally("own")}, {teamName("opponent")} {tally("opponent")}</p></div>
    <KitsLearned kits={kits} remembered={remembered} teams={teams} />
    <p className="text-sm text-fg-muted">Team and role suggestions update across this run as you correct people. Different camera views are learned separately; conflicting views stay unassigned. <a className="text-accent underline" href={`${BASE}/jobs/${jobId}/review/learned-model`}>View saved learned model</a></p>
    <ol className="list-decimal space-y-1 pl-5 text-sm text-fg-muted">
      <li>Below, mark look-alike groups that are clearly <strong>not players</strong> (spectators, coaches) or referees. Leave mixed groups alone.</li>
      <li>On the video, click one player from each team and choose their team. Everyone else in that kit is assigned straight away, through the whole clip, even when the tracker loses and picks them up again. Goalkeepers have their own buttons.</li>
      <li>Keepers and referees in black or dark kits look alike, so label one of each; similar-looking people follow. Rings: blue our team, orange opponent, yellow referee, white not assigned. Bold rings are your labels, solid rings are matched by kit, faint rings are look-alike suggestions. Correct any that are wrong.</li>
      <li>Once a few players are labelled, people beyond the far edge of play (spectators, other pitches) lose their rings. Tick <strong>Show everyone</strong> under the video to see them again.</li>
    </ol>
    <div className="space-y-2">{appearance.groups.map(group => {
      const current = review.group_labels.find(g => g.group_id === group.id);
      return <div key={group.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-2">
        <div className="flex gap-0.5" aria-label={`Look-alike group ${group.id + 1}: ${group.size} tracked people`}>{group.examples.slice(0, 10).map(track => { const i = thumbs.get(track) ?? 0; return <div key={track} className="rounded-sm" style={{ width: sprite.w, height: sprite.h, backgroundImage: `url(${BASE}/jobs/${jobId}/files/${sprite.file})`, backgroundPosition: `-${(i % sprite.cols) * sprite.w}px -${Math.floor(i / sprite.cols) * sprite.h}px` }} />; })}</div>
        <span className="text-xs text-fg-muted">Group {group.id + 1} · {group.size}</span>
        <div className="ml-auto flex flex-wrap gap-1">{GROUP_CHOICES.map(choice => { const on = choice.role ? current?.role === choice.role && current?.team === choice.team : !current; return <button key={choice.label} aria-pressed={on} onClick={() => setGroup(group.id, choice.team, choice.role)} className={`rounded-md border px-2 py-1 text-xs ${on ? "border-accent bg-accent/15 text-fg" : "border-line text-fg-muted hover:border-accent/60"}`}>{choice.label}</button>; })}</div>
      </div>;
    })}</div>
    <p className="text-xs text-fg-muted">Groups are look-alikes, not teams: sun and shade split one kit, and similar kits can mix.</p>
  </section>;
}

export function TeamSummary({ moments }: { moments: Moment[] }) {
  const live = moments.filter(m => m.status !== "rejected");
  const rows: [Team | null, string][] = [["own", "Our team"], ["opponent", "Opponent"], [null, "No team yet"]];
  const n = (team: Team | null, test: (m: Moment) => boolean) => live.filter(m => m.team === team && test(m)).length;
  return <section className="panel p-4" aria-label="Team statistics"><h2 className="mb-3 font-semibold">Team statistics</h2>
    <table className="w-full text-sm"><thead className="text-left text-xs text-fg-muted"><tr><th className="py-1 font-normal">Team</th><th className="font-normal">Veo tags</th><th className="font-normal">Approved actions</th><th className="font-normal">Estimated, to review</th></tr></thead>
      <tbody>{rows.map(([team, label]) => <tr key={label} className="border-t border-line"><td className="py-1.5">{label}</td><td className="tabular-nums">{n(team, m => m.source === "veo")}</td><td className="tabular-nums">{n(team, m => m.source !== "veo" && m.status === "approved")}</td><td className="tabular-nums">{n(team, m => m.status === "unreviewed")}</td></tr>)}</tbody></table>
    <p className="mt-2 text-xs text-fg-muted">Veo counts are Veo's own tags. Estimated teams come from who was nearest the ball (or the camera's focus) and become counts you can trust only once approved.</p>
  </section>;
}
