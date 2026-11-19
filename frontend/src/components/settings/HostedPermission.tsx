import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { confirmHostedPermission, PERMISSIONS_KEY, type Service, useHostedPermissions } from "../../api/hostedPermissions";
import { Button } from "../ui/Button";

const NAME: Record<Service, string> = { hudl: "Hudl", veo: "Veo" };

/** Phase 2, task 030 (owner-approved wording): the user's own permission, per service. */
export function HostedPermission({ service }: { service: Service }) {
  const q = useHostedPermissions();
  const qc = useQueryClient();
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await confirmHostedPermission(service);
      await qc.invalidateQueries({ queryKey: PERMISSIONS_KEY });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded-xl border border-line bg-ink-900/60 p-4" role="group" aria-label={`${NAME[service]} permission`}>
      <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} aria-hidden className="text-accent" /> Your permission comes first</p>
      <p className="text-sm text-fg-muted">This library signs in to {NAME[service]} with your own account and saves what your account can already view. Confirm before connecting:</p>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1" checked={ticked} onChange={(e) => setTicked(e.target.checked)} />
        <span>{q.data?.wording}</span>
      </label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button variant="primary" disabled={!ticked || busy || !q.data?.wording} onClick={() => void confirm()}>Confirm for {NAME[service]}</Button>
    </div>
  );
}
