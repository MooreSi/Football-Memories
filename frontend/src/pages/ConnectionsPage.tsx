import { useQuery } from "@tanstack/react-query";
import { Check, PlugZap, X } from "lucide-react";
import { api } from "../api/client";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";

const LABELS: Record<string, string> = {
  list_teams: "List teams",
  list_matches: "Discover matches",
  retrieve_tags: "Tagged moments",
  play_video: "Play video",
  download_full_video: "Download full matches",
  download_clips: "Download clips",
  import_files: "Import files",
};

export function ConnectionsPage({ embedded = false }: { embedded?: boolean }) {
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
        <div className="grid gap-5 lg:grid-cols-2">
          {q.data.map((c) => (
            <section key={c.id} className="panel space-y-4 p-5" aria-label={c.name}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                {c.available ? <Badge tone="ok">Available</Badge> : <Badge tone="warn">Not available</Badge>}
              </div>
              {c.reason && <p className="text-sm text-fg-muted">{c.reason}</p>}
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(c.capabilities).map(([k, on]) => (
                  <li key={k} className={`flex items-center gap-2 ${on ? "text-fg" : "text-fg-subtle"}`}>
                    {on ? <Check size={15} className="text-ok" aria-hidden /> : <X size={15} aria-hidden />}
                    <span>
                      {LABELS[k] ?? k}
                      <span className="sr-only">{on ? " (supported)" : " (not supported)"}</span>
                    </span>
                  </li>
                ))}
              </ul>
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
            </section>
          ))}
        </div>
      )}
    </>
  );
}
