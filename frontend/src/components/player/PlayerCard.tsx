import { useState } from "react";
import type { CardStyleId, PlayerProfile } from "../../api/types";
import { abbreviate } from "../../lib/player";
import { PlayerAvatar } from "./PlayerAvatar";

/** Spec 190: card finishes. Each is a crisp gradient edge, a solid-toned face and a
 *  diagonal foil sheen; no imagery sits behind text, so nothing looks blurred. */
export const CARD_STYLES: { id: CardStyleId; label: string; swatch: string }[] = [
  { id: "classic", label: "Classic", swatch: "linear-gradient(135deg,#22d3ee,#3b82f6,#7c5cff)" },
  { id: "gold", label: "Gold", swatch: "linear-gradient(135deg,#fff3c4,#e4b33a,#9a6b06)" },
  { id: "silver", label: "Silver", swatch: "linear-gradient(135deg,#ffffff,#c3cad6,#6b7486)" },
  { id: "bronze", label: "Bronze", swatch: "linear-gradient(135deg,#ffd2a6,#c0763b,#6e3a14)" },
  { id: "emerald", label: "Emerald", swatch: "linear-gradient(135deg,#b6f5d8,#21b47c,#065f46)" },
  { id: "midnight", label: "Midnight", swatch: "linear-gradient(135deg,#a5b4fc,#4338ca,#111036)" },
  { id: "sunset", label: "Sunset", swatch: "linear-gradient(135deg,#fda4af,#f97316,#8b5cf6)" },
];

function Crest({ club }: { club: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={`/api/team-logo?name=${encodeURIComponent(club)}`}
      alt={`${club} crest`}
      onError={() => setFailed(true)}
      className="card-crest absolute top-5 left-5 size-12 object-contain"
    />
  );
}

/** Reference 03's shield card: headline Moments and Games, then the most frequent tag counts. */
export function PlayerCard({ player, moments, games }: { player: PlayerProfile; moments?: number; games?: number }) {
  const style = player.card_style ?? "classic";
  const totalMoments = moments ?? player.totals.moments;
  const totalGames = games ?? player.totals.matches;
  const six = player.categories.filter((c) => c.name !== "Tagged moments").slice(0, 6);
  const left = six.slice(0, 3);
  const right = six.slice(3, 6);
  const cell = (c: { name: string; count: number }) => (
    <li key={c.name} title={`${c.name}: ${c.count} tagged`} className="flex items-baseline gap-2">
      <span className="text-xl font-bold tabular-nums">{c.count}</span>
      <span className="card-muted text-xs font-semibold tracking-wide">{abbreviate(c.name)}</span>
    </li>
  );
  return (
    <figure
      aria-label={`${player.display_name} player card`}
      data-card-style={style}
      className="player-shield relative mx-auto w-full max-w-[300px] self-start p-[2px] [clip-path:polygon(0_6%,12%_0,88%_0,100%_6%,100%_80%,50%_100%,0_80%)]"
    >
      <div className="player-shield-inner relative px-6 pt-8 pb-16 text-center [clip-path:polygon(0_6%,12%_0,88%_0,100%_6%,100%_80%,50%_100%,0_80%)]">
        {player.club_name && <Crest key={player.club_name} club={player.club_name} />}
        <div className="relative mx-auto mb-4 w-fit">
          <PlayerAvatar name={player.display_name} photoUrl={player.photo_url} size={player.photo_url ? "xl" : "lg"} square={Boolean(player.photo_url)} />
          {player.shirt_number && (
            <span className="card-number absolute -right-2 -bottom-2 grid size-9 place-items-center rounded-full border-2 text-sm font-bold">
              {player.shirt_number}
            </span>
          )}
        </div>
        <figcaption className="text-2xl font-extrabold tracking-wide uppercase">{player.display_name}</figcaption>
        {player.position && <p className="card-accent mt-1 text-sm font-semibold">{player.position}</p>}
        <div className="card-rule mx-auto my-4 h-px w-4/5" />
        <dl className="grid grid-cols-2">
          <div className="card-divider border-r pr-4 text-right">
            <dt className="sr-only">Moments</dt>
            <dd className="text-3xl leading-none font-extrabold tabular-nums">{totalMoments}</dd>
            <dd aria-hidden className="card-muted mt-1 text-[11px] font-semibold tracking-[0.18em] uppercase">Moments</dd>
          </div>
          <div className="pl-4 text-left">
            <dt className="sr-only">{totalGames === 1 ? "Game" : "Games"}</dt>
            <dd className="text-3xl leading-none font-extrabold tabular-nums">{totalGames}</dd>
            <dd aria-hidden className="card-muted mt-1 text-[11px] font-semibold tracking-[0.18em] uppercase">{totalGames === 1 ? "Game" : "Games"}</dd>
          </div>
        </dl>
        {six.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-6">
            <ul className="card-divider space-y-0.5 border-r pr-4 text-right">{left.map(cell)}</ul>
            <ul className="space-y-0.5 text-left">{right.map(cell)}</ul>
          </div>
        )}
        <p className="card-muted mt-3 text-[10px] tracking-wider uppercase opacity-80">Tag counts, not ratings</p>
      </div>
    </figure>
  );
}
