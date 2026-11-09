import type { PlayerProfile } from "../../api/types";
import { abbreviate } from "../../lib/player";
import { PlayerAvatar } from "./PlayerAvatar";

/** Reference 03's shield card. The six numbers are the player's most frequent tag counts. */
export function PlayerCard({ player }: { player: PlayerProfile }) {
  const six = player.categories.slice(0, 6);
  const left = six.slice(0, 3);
  const right = six.slice(3, 6);
  const cell = (c: { name: string; count: number }) => (
    <li key={c.name} title={`${c.name}: ${c.count} tagged`} className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tabular-nums">{c.count}</span>
      <span className="text-sm font-semibold tracking-wide text-fg-muted">{abbreviate(c.name)}</span>
    </li>
  );
  return (
    <figure
      aria-label={`${player.display_name} player card`}
      className="player-shield relative mx-auto w-full max-w-[300px] self-start bg-gradient-to-b from-accent/70 via-[#3b82f6]/50 to-violet/60 p-[2px] [clip-path:polygon(0_6%,12%_0,88%_0,100%_6%,100%_80%,50%_100%,0_80%)]"
    >
      <div className="player-shield-inner bg-gradient-to-b from-ink-700 to-ink-900 px-6 pt-8 pb-16 text-center [clip-path:polygon(0_6%,12%_0,88%_0,100%_6%,100%_80%,50%_100%,0_80%)]">
        <div className="relative mx-auto mb-4 w-fit">
          <PlayerAvatar name={player.display_name} photoUrl={player.photo_url} size={player.photo_url ? "xl" : "lg"} square={Boolean(player.photo_url)} />
          {player.shirt_number && (
            <span className="absolute -right-2 -bottom-2 grid size-9 place-items-center rounded-full border-2 border-ink-800 bg-pin text-sm font-bold text-ink-950">
              {player.shirt_number}
            </span>
          )}
        </div>
        <figcaption className="text-2xl font-extrabold tracking-wide uppercase">{player.display_name}</figcaption>
        {player.position && <p className="mt-1 text-sm font-semibold text-accent">{player.position}</p>}
        <div className="mx-auto my-4 h-px w-4/5 bg-white/15" />
        {six.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6">
            <ul className="space-y-1 border-r border-white/15 pr-4 text-right">{left.map(cell)}</ul>
            <ul className="space-y-1 text-left">{right.map(cell)}</ul>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">No tagged moments yet</p>
        )}
        <p className="mt-3 text-[10px] tracking-wider text-fg-subtle uppercase">Tag counts, not ratings</p>
      </div>
    </figure>
  );
}
