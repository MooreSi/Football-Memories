import { useQuery } from "@tanstack/react-query";
import { Wifi } from "lucide-react";
import { hudlRequest } from "../../api/hudl";

type Network = { host: string | null; ip: string | null };

/** Owner request 2026-11-14: the address phones and tablets on the same home network
 *  use, read by the desktop helper on this computer. */
export function LanAddress({ port = window.location.port || "8765" }: { port?: string }) {
  const q = useQuery<Network>({ queryKey: ["lan-address"], queryFn: () => hudlRequest("/network"), retry: false, staleTime: 60_000 });
  const urls = [q.data?.host, q.data?.ip].filter((x): x is string => Boolean(x)).map((h) => `http://${h}:${port}`);
  return (
    <section aria-label="On your home network" className="panel flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
      <Wifi size={18} className="text-accent" aria-hidden />
      <h2 className="text-sm font-semibold">On your home network</h2>
      {q.isPending ? <span className="text-sm text-fg-muted">Finding this computer's address…</span>
        : urls.length ? <>
          {urls.map((u) => <code key={u} className="select-all rounded-md bg-ink-900 px-2 py-1 text-sm text-fg">{u}</code>)}
          <p className="basis-full text-xs text-fg-subtle">Open {urls.length > 1 ? "either address" : "this address"} on a phone, tablet or another computer on the same Wi-Fi. The app has no password on your network.</p>
        </>
        : <span className="text-sm text-fg-muted">Start the desktop helper to see this computer's network address.</span>}
    </section>
  );
}
