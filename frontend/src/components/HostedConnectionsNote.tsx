import { PlugZap } from "lucide-react";
import { Link } from "react-router-dom";

/** Hosted copies (owner decision 011, phase 2): Hudl and Veo appear once the user has
 *  connected their own account in Settings, Connections, after confirming permission. */
export function HostedConnectionsNote() {
  return (
    <section aria-label="Hudl and Veo" className="tile flex flex-wrap items-center gap-4 p-4">
      <PlugZap size={20} aria-hidden className="text-accent" />
      <div className="mr-auto min-w-0">
        <p className="text-sm font-semibold">Hudl and Veo</p>
        <p className="text-sm text-fg-muted">Connect your own Hudl or Veo account to bring your matches in here, or add match videos with Import.</p>
      </div>
      <Link to="/settings/connections" className="dashboard-import">Connect Hudl or Veo</Link>
      <Link to="/import" className="dashboard-import">Import a match</Link>
    </section>
  );
}

/** Shown where a hosted page needs a service the user has not connected yet. */
export function HostedNeedsConnection() {
  return <div className="mt-6"><HostedConnectionsNote /></div>;
}
