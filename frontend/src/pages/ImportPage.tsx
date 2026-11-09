import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileVideo, FolderInput, RefreshCw, Tags } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import type { ImportBody } from "../api/types";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";
import { formatBytes } from "../lib/format";

function guessSeason(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const start = d.getMonth() >= 6 ? y : y - 1; // seasons start in July
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

const EMPTY: Omit<ImportBody, "filename"> = {
  team_name: "", season_label: "", opponent: "", match_date: "", age_group: null, competition: null,
};

export function ImportPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: api.inbox });
  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const mutation = useMutation({
    mutationFn: api.importMatch,
    onSuccess: (m) => {
      void qc.invalidateQueries();
      navigate(`/matches/${m.id}`);
    },
  });

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value || (k === "age_group" || k === "competition" ? null : "") };
      if (k === "match_date" && !f.season_label) next.season_label = guessSeason(value);
      return next;
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (selected) mutation.mutate({ filename: selected, ...form });
  };

  const err = mutation.error instanceof ApiError ? mutation.error : null;
  const existingId = err?.status === 409 ? (err.detail as { existing_match_id?: number })?.existing_match_id : undefined;

  return (
    <>
      <PageHeader eyebrow="Archive" title="Import a match">
        <Button variant="ghost" onClick={() => void inbox.refetch()}>
          <RefreshCw size={15} aria-hidden /> Refresh folder
        </Button>
      </PageHeader>

      <p className="mb-6 max-w-3xl text-sm text-fg-muted">
        Put match videos you have downloaded (for example through Hudl's own download feature) into the import
        folder. Optional: add <code className="text-fg">&lt;same name&gt;.tags.csv</code> with tagged moments. The
        original file is copied and verified; it is never moved or deleted.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-label="Files in the import folder">
          {inbox.isPending ? (
            <Spinner label="Reading import folder" />
          ) : inbox.isError ? (
            <EmptyState icon={FolderInput} title="Could not read the import folder">
              {(inbox.error as Error).message}
            </EmptyState>
          ) : inbox.data.length === 0 ? (
            <EmptyState icon={FolderInput} title="The import folder is empty">
              Copy a video file (.mp4, .mov, .mkv) into the import folder configured on the server, then refresh.
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {inbox.data.map((f) => (
                <li key={f.filename}>
                  <label
                    className={`panel flex cursor-pointer items-center gap-3 p-3 transition ${
                      selected === f.filename ? "ring-2 ring-accent/60" : "hover:border-accent/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="file"
                      className="accent-[#22d3ee]"
                      checked={selected === f.filename}
                      onChange={() => setSelected(f.filename)}
                    />
                    <FileVideo size={18} className="text-accent" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm">{f.filename}</span>
                    {f.has_tags && (
                      <Badge tone="accent">
                        <Tags size={11} aria-hidden /> tags
                      </Badge>
                    )}
                    <span className="text-xs text-fg-muted">{formatBytes(f.size_bytes)}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form onSubmit={submit} className="panel h-fit space-y-4 p-5" aria-label="Match details">
          <h2 className="font-semibold">Match details</h2>
          <label className="block space-y-1 text-sm">
            <span className="text-fg-muted">Team *</span>
            <input className="field" list="team-names" required value={form.team_name} onChange={set("team_name")} />
            <datalist id="team-names">
              {teams.data?.map((t) => <option key={t.id} value={t.name} />)}
            </datalist>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-fg-muted">Opponent *</span>
            <input className="field" required value={form.opponent} onChange={set("opponent")} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span className="text-fg-muted">Date *</span>
              <input className="field" type="date" required value={form.match_date} onChange={set("match_date")} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-muted">Season *</span>
              <input className="field" required placeholder="2026/27" value={form.season_label} onChange={set("season_label")} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-muted">Age group</span>
              <input className="field" placeholder="U12" value={form.age_group ?? ""} onChange={set("age_group")} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-fg-muted">Competition</span>
              <input className="field" value={form.competition ?? ""} onChange={set("competition")} />
            </label>
          </div>

          {mutation.isError && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {mutation.error.message}
              {existingId && (
                <>
                  {" "}
                  <Link className="underline" to={`/matches/${existingId}`}>
                    Open the existing match
                  </Link>
                </>
              )}
            </p>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={!selected || mutation.isPending}>
            {mutation.isPending ? "Importing and verifying" : selected ? "Import match" : "Choose a file first"}
          </Button>
        </form>
      </div>
    </>
  );
}
