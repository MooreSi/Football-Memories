import { PlugZap } from "lucide-react";
import { Link } from "react-router-dom";

/** Hosted copies (owner decision 011): connecting a user's own Hudl or Veo account inside their
 *  hosted library is phase 2 of the hosted gateway plan. Until then, say so plainly. */
export function HostedConnectionsNote() {
  return (
    <section aria-label="Hudl and Veo" className="tile flex flex-wrap items-center gap-4 p-4">
      <PlugZap size={20} aria-hidden className="text-accent" />
      <div className="mr-auto min-w-0">
        <p className="text-sm font-semibold">Hudl and Veo</p>
        <p className="text-sm text-fg-muted">Connecting your own Hudl or Veo account is coming to hosted libraries. Until then, add your match videos with Import.</p>
      </div>
      <Link to="/import" className="dashboard-import">Import a match</Link>
    </section>
  );
}
