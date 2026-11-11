import type { ReactNode } from "react";
import { TeamBadge } from "./TeamBadge";

/** Two clubs side by side. Crests share the first grid row and names the second, so a
 *  long or wrapping name never moves its crest (owner request 2026-11-11). */
export function FixtureCrests({ home, away, middle, size = "lg", nameClass = "text-sm font-medium" }: {
  home: string; away: string; middle: ReactNode; size?: "sm" | "md" | "lg"; nameClass?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2 gap-y-2 text-center">
      <div data-crest-slot className="col-start-1 row-start-1 flex justify-center"><TeamBadge name={home} size={size} tone="home" /></div>
      <div className="col-start-2 row-start-1 flex flex-col items-center justify-center self-center">{middle}</div>
      <div data-crest-slot className="col-start-3 row-start-1 flex justify-center"><TeamBadge name={away} size={size} tone="away" /></div>
      <span className={`col-start-1 row-start-2 leading-tight break-words ${nameClass}`}>{home}</span>
      <span className={`col-start-3 row-start-2 leading-tight break-words ${nameClass}`}>{away}</span>
    </div>
  );
}
