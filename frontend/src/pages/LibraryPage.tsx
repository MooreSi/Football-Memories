import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Film, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Spinner } from "../components/ui/Spinner";

const PAGE_SIZE = 24;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function LibraryPage() {
  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<number | undefined>();
  const [seasonId, setSeasonId] = useState<number | undefined>();
  const q = useDebounced(search.trim(), 250);

  const teams = useQuery({ queryKey: ["teams"], queryFn: api.teams });
  const seasons = useQuery({ queryKey: ["seasons"], queryFn: api.seasons });
  const matches = useInfiniteQuery({
    queryKey: ["matches", q, teamId, seasonId],
    queryFn: ({ pageParam }) => api.matches({ q, teamId, seasonId, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.page_size < last.total ? last.page + 1 : undefined),
  });

  const items = matches.data?.pages.flatMap((p) => p.items) ?? [];
  const total = matches.data?.pages[0]?.total ?? 0;
  const filtering = Boolean(q || teamId || seasonId);

  return (
    <>
      <PageHeader eyebrow="Archive" title="Match Library">
        <Link to="/import">
          <Button variant="primary">Import match</Button>
        </Link>
      </PageHeader>

      <div className="panel mb-6 flex flex-wrap items-center gap-3 p-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Search matches</span>
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            className="field pl-9"
            placeholder="Search opponent, team or competition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Team</span>
          <select className="field w-auto" value={teamId ?? ""} onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All teams</option>
            {teams.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Season</span>
          <select className="field w-auto" value={seasonId ?? ""} onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">All seasons</option>
            {seasons.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {!matches.isPending && (
          <span className="ml-auto text-xs text-fg-muted">
            {total} {total === 1 ? "match" : "matches"}
          </span>
        )}
      </div>

      {matches.isPending ? (
        <Spinner label="Loading matches" />
      ) : matches.isError ? (
        <EmptyState icon={Film} title="Could not load the library">
          {(matches.error as Error).message}. Check that the backend is running.
        </EmptyState>
      ) : items.length === 0 ? (
        filtering ? (
          <EmptyState icon={Search} title="No matches found">
            Nothing matches these filters.
          </EmptyState>
        ) : (
          <EmptyState icon={Film} title="No matches yet">
            <p className="mb-4">Put a match video in the import folder, then import it to start your archive.</p>
            <Link to="/import" className="font-medium text-accent hover:underline">
              Import a match
            </Link>
          </EmptyState>
        )
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
          {matches.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button onClick={() => void matches.fetchNextPage()} disabled={matches.isFetchingNextPage}>
                {matches.isFetchingNextPage ? "Loading" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
