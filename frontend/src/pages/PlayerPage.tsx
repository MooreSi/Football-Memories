import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { initials } from "../components/TeamBadge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";

/** /player: opens the primary player's hub, or lets the owner choose one. */
export function PlayerPage({ choose = false }: { choose?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const prefs = useQuery({ queryKey: ["preferences"], queryFn: api.preferences });
  const players = useQuery({ queryKey: ["players"], queryFn: api.players });
  const pick = useMutation({
    mutationFn: (id: number) => api.setPrimaryPlayer(id),
    onSuccess: (r) => {
      void qc.invalidateQueries();
      navigate(`/player/${r.primary_player_id}`);
    },
  });

  if (prefs.isPending || players.isPending) return <Spinner />;
  const primary = prefs.data?.primary_player_id;
  if (primary && !choose) return <Navigate to={`/player/${primary}`} replace />;

  return (
    <>
      <PageHeader eyebrow="My player" title="Choose your player" />
      <p className="mb-6 max-w-2xl text-sm text-fg-muted">
        Pick the player whose football journey you want to follow. The app remembers your choice, shows their moments
        first and builds their memories timeline. You can change it at any time.
      </p>
      {!players.data || players.data.length === 0 ? (
        <EmptyState icon={UserRound} title="No players yet">
          Players appear when you import a match with a tags file that names them.{" "}
          <Link to="/import" className="text-accent hover:underline">Import a match</Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {players.data.map((p) => (
            <li key={p.id} className="tile flex items-center gap-4 p-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent/90 to-[#2563eb] text-lg font-bold text-ink-950">
                {initials(p.display_name)}
              </span>
              <div className="min-w-0 flex-1">
                <Link to={`/player/${p.id}`} className="block truncate font-semibold hover:text-accent">{p.display_name}</Link>
                <p className="text-xs text-fg-muted">{p.moments} moments · {p.matches} matches</p>
              </div>
              {primary === p.id ? (
                <span className="inline-flex items-center gap-1 text-xs text-pin"><Star size={14} className="fill-pin" aria-hidden /> Yours</span>
              ) : (
                <button type="button" onClick={() => pick.mutate(p.id)} disabled={pick.isPending}
                  className="rounded-full border border-accent/50 px-3 py-1.5 text-xs text-accent hover:bg-accent/10">
                  Choose
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
