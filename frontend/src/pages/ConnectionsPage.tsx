import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, PlugZap, X } from "lucide-react";
import { api } from "../api/client";
import { HudlAccount } from "../components/settings/HudlAccount";
import { HudlCapture } from "../components/settings/HudlCapture";
import { VeoAccount } from "../components/settings/VeoAccount";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";
import { HIDDEN_KEY, readHidden } from "../lib/connections";
import { HomeTeamField } from "../components/settings/HomeTeamField";
import { ClubCrestUpload } from "../components/settings/ClubCrestUpload";

const LABELS: Record<string, string> = {
  list_teams: "List teams",
  list_matches: "Discover matches",
  retrieve_tags: "Tagged moments",
  play_video: "Play video",
  download_full_video: "Download full matches",
  download_clips: "Download clips",
  import_files: "Import files",
};


function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
    className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-900/70 px-3 py-1.5 text-sm text-fg-muted hover:text-fg">
    <span aria-hidden className={`relative h-5 w-9 rounded-full transition ${on ? "bg-accent" : "bg-ink-700"}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} /></span>
    {label}
  </button>;
}

export function ConnectionsPage({ embedded = false }: { embedded?: boolean }) {
  const [hudlState, setHudlState] = useState<string | null>(null);
  const [veoState, setVeoState] = useState<string | null>(null);
  const [hidden, setHidden] = useState<string[]>(readHidden);
  useEffect(() => { try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)); } catch { /* a convenience only */ } }, [hidden]);
  const shown = (id: string) => !hidden.includes(id);
  const show = (id: string, on: boolean) => setHidden((h) => (on ? h.filter((x) => x !== id) : [...new Set([...h, id])]));
  const q = useQuery({ queryKey: ["connectors"], queryFn: api.connectors });

  return (
    <>
      {!embedded && <PageHeader eyebrow="Settings" title="Connections" />}
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <EmptyState icon={PlugZap} title="Could not load connections">
          {(q.error as Error).message}
        </EmptyState>
      ) : (
        <div className="space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Connections shown">
          <Toggle label="Show Hudl" on={shown("hudl")} onChange={(on) => show("hudl", on)} />
          <Toggle label="Show Veo" on={shown("veo")} onChange={(on) => show("veo", on)} />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {q.data.filter((c) => c.id !== "local_import" && (c.id !== "hudl" || shown("hudl"))).map((c) => (
            <section key={c.id} className="panel h-fit space-y-4 p-5" aria-label={c.name}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                {c.id === "hudl" && hudlState ? <Badge tone={hudlState === "Connected" ? "ok" : "warn"}>{hudlState}</Badge>
                  : c.available ? <Badge tone="ok">Available</Badge> : <Badge tone="warn">Not available</Badge>}
              </div>
              {c.reason && (c.id !== "hudl" || !hudlState) && <p className="text-sm text-fg-muted">{c.reason}</p>}
              {c.id === "hudl" && hudlState && <p className="text-sm text-fg-muted">Save your Hudl account securely, select Connect, then choose a cached match to stream or download.</p>}
              {c.id === "hudl" && (
                <div className="space-y-2 border-y border-line py-3">
                  <a
                    href="https://www.hudl.com/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-lg bg-accent/10 px-3.5 py-2 text-sm font-semibold text-accent hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Sign in on Hudl
                  </a>
                  <p className="text-xs text-fg-muted">
                    Use your own Hudl credentials. This opens Hudl and does not connect this app
                    to your account. The desktop capture helper signs in separately to save a match
                    and its tags; then use Import to add those files to your library.
                  </p>
                </div>
              )}
              {(c.id !== "hudl" || !hudlState) && <ul className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(c.capabilities).map(([k, on]) => (
                  <li key={k} className={`flex items-center gap-2 ${on ? "text-fg" : "text-fg-subtle"}`}>
                    {on ? <Check size={15} className="text-ok" aria-hidden /> : <X size={15} aria-hidden />}
                    <span>
                      {LABELS[k] ?? k}
                      <span className="sr-only">{on ? " (supported)" : " (not supported)"}</span>
                    </span>
                  </li>
                ))}
              </ul>}
              {c.limitations.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-fg-muted">
                  {c.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
              {c.docs && (
                <p className="text-xs text-fg-subtle">
                  Details: <code>{c.docs}</code> in the project folder.
                </p>
              )}
              {c.id === "hudl" && <><HudlAccount onConnectionChange={setHudlState} /><HomeTeamField source="hudl" /><details><summary className="cursor-pointer text-sm text-fg-muted">Capture a match by URL</summary><div className="mt-4"><HudlCapture /></div></details></>}
            </section>
          ))}
          {shown("veo") && <section className="panel h-fit space-y-4 p-5" aria-label="Veo">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Veo</h2>
              {veoState && <Badge tone={veoState === "Connected" ? "ok" : "warn"}>{veoState}</Badge>}</div>
            <p className="text-sm text-fg-muted">Connect the Veo account you record with. The desktop helper signs in with your saved account and reads your Veo match list, details and highlights; it never changes anything on Veo. Watch and download Veo matches from All matches.</p>
            <VeoAccount onConnectionChange={setVeoState} />
            <HomeTeamField source="veo" />
          </section>}
        </div>
        <section aria-label="Club crests" className="panel space-y-3 p-5">
          <h2 className="text-lg font-semibold">Club crests</h2>
          <p className="text-sm text-fg-muted">Crests come from Wikipedia where the club has a page. For grassroots clubs, add the crest yourself; it is used for Veo and Hudl matches alike.</p>
          <ClubCrestUpload />
        </section>
        </div>
      )}
    </>
  );
}
