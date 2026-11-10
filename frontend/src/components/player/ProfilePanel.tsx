import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, Pencil, Shield, Shirt, Trash2 } from "lucide-react";
import { type FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { PlayerProfile } from "../../api/types";
import { initials } from "../TeamBadge";
import { Button } from "../ui/Button";
import { PhotoCropper } from "./PhotoCropper";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="profile-chip inline-flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800/80 px-3.5 py-2 text-sm">
      {children}
    </span>
  );
}

/** Reference 03's "My teams / My numbers / My roles / My teammates" panels. */
export function ProfilePanel({ player }: { player: PlayerProfile }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: player.display_name, shirt_number: player.shirt_number ?? "", position: player.position ?? "",
  });
  const save = useMutation({
    mutationFn: () => api.updatePlayer(player.id, form),
    onSuccess: () => {
      setEditing(false);
      void qc.invalidateQueries();
    },
  });
  const photoInput = useRef<HTMLInputElement>(null);
  const [cropping, setCropping] = useState<File>();
  const upload = useMutation({
    mutationFn: (file: File) => api.uploadPhoto(player.id, file),
    onSuccess: () => void qc.invalidateQueries(),
  });
  const removePhoto = useMutation({
    mutationFn: () => api.removePhoto(player.id),
    onSuccess: () => void qc.invalidateQueries(),
  });
  const photoError = (upload.error ?? removePhoto.error) as Error | null;
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => scroller.current?.scrollBy({ left: d * 200, behavior: "smooth" });

  return (
    <div className="space-y-4">
      <section aria-label="Teams and numbers" className="panel space-y-5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Teams</h2>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
              <Pencil size={14} aria-hidden /> Edit
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {player.teams.length === 0 && <span className="text-sm text-fg-muted">No matches yet.</span>}
          {player.teams.map((t) => (
            <Chip key={`${t.team_name}-${t.season_label}`}>
              <Shield size={15} className="text-accent" aria-hidden />
              {t.team_name}
              <span className="text-xs text-fg-muted">
                {[t.age_group, t.season_label].filter(Boolean).join(" · ")}
              </span>
            </Chip>
          ))}
        </div>

        {editing ? (
          <form
            className="grid gap-3 sm:grid-cols-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2 rounded-xl border border-white/10 bg-ink-900/60 p-3 sm:col-span-3">
              <p className="text-sm text-fg-muted">Photo</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  aria-label="Choose a photo"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    // Owner request: always position, resize and crop before saving.
                    if (f) setCropping(f);
                    e.target.value = "";
                  }}
                />

                <Button type="button" onClick={() => photoInput.current?.click()} disabled={upload.isPending}>
                  <Camera size={15} aria-hidden /> {upload.isPending ? "Uploading" : player.photo_url ? "Change photo" : "Add photo"}
                </Button>

                {player.photo_url && (
                  <Button type="button" variant="ghost" onClick={() => removePhoto.mutate()} disabled={removePhoto.isPending}>
                    <Trash2 size={15} aria-hidden /> Remove photo
                  </Button>
                )}
              </div>
              <p className="text-xs text-fg-subtle">
                Any photo size. You position, resize and crop it before it is saved. Stored only on this computer,
                with location and camera details removed.
              </p>
              {photoError && <p role="alert" className="text-sm text-danger">{photoError.message}</p>}
              {cropping && (
                <PhotoCropper file={cropping} onCancel={() => setCropping(undefined)}
                  onSave={(photo) => { setCropping(undefined); upload.mutate(photo); }} />
              )}
            </div>
            <label className="space-y-1 text-sm sm:col-span-3">
              <span className="text-fg-muted">Display name</span>
              <input className="field" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-fg-muted">Shirt number</span>
              <input className="field" maxLength={10} value={form.shirt_number} onChange={(e) => setForm({ ...form, shirt_number: e.target.value })} />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-fg-muted">Position</span>
              <input className="field" maxLength={40} placeholder="e.g. Goalkeeper" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            </label>
            {save.isError && <p role="alert" className="text-sm text-danger sm:col-span-3">{(save.error as Error).message}</p>}
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-fg-muted">Shirt number</h3>
              {player.shirt_number ? (
                <Chip><Shirt size={15} aria-hidden /> {player.shirt_number}</Chip>
              ) : (
                <span className="text-sm text-fg-subtle">Not set</span>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-fg-muted">Position</h3>
              {player.position ? <Chip>{player.position}</Chip> : <span className="text-sm text-fg-subtle">Not set</span>}
            </div>
          </div>
        )}
      </section>

      <section aria-label="Tagged with" className="panel p-5">
        <h2 className="mb-1 text-center text-lg font-semibold">Tagged with</h2>
        <p className="mb-3 text-center text-xs text-fg-subtle">Players on the same moments</p>
        {player.teammates.length === 0 ? (
          <p className="text-center text-sm text-fg-muted">Nobody else is tagged on these moments yet.</p>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className="grid size-8 shrink-0 place-items-center rounded-full border border-line hover:border-accent/50">
              <ChevronLeft size={16} />
            </button>
            <div ref={scroller} className="flex flex-1 gap-3 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none]">
              {player.teammates.map((t) => (
                <Link key={t.id} to={`/player/${t.id}`} title={`${t.display_name}: ${t.shared_moments} shared`} className="flex shrink-0 flex-col items-center gap-1">
                  <span className="grid size-12 place-items-center rounded-full border-2 border-fg/70 text-sm font-bold hover:border-accent">
                    {initials(t.display_name)}
                  </span>
                  <span className="max-w-16 truncate text-[11px] text-fg-muted">{t.display_name}</span>
                </Link>
              ))}
            </div>
            <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className="grid size-8 shrink-0 place-items-center rounded-full border border-line hover:border-accent/50">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
