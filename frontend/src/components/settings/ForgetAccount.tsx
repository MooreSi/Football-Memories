import { useState } from "react";
import { Button } from "../ui/Button";

/** Owner request 2026-11-20: Disconnect forgets a Hudl or Veo account: the saved login and
 *  the cached matches, details and posters on this computer. It asks first, because the
 *  match list and tags take a long time to read again. Downloads are never removed. */
export function ForgetAccount({ service, where, disabled, pending, onForget }: {
  service: "Hudl" | "Veo"; where: string; disabled: boolean; pending: boolean; onForget: () => void;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button type="button" disabled={disabled} onClick={() => setAsking(true)}>Disconnect</Button>;
  return (
    <div role="group" aria-label={`Disconnect ${service}`} className="basis-full space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
      <p>Disconnect {service}? This removes the saved login from {where} and the cached {service} matches,
        details and posters on this computer. Your downloaded matches, reels and moments are kept.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" disabled={pending} onClick={() => { onForget(); setAsking(false); }}>
          {pending ? "Removing…" : "Disconnect and remove"}</Button>
        <Button type="button" disabled={pending} onClick={() => setAsking(false)}>Cancel</Button>
      </div>
    </div>
  );
}
