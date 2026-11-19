import { useQuery } from "@tanstack/react-query";
import { HOSTED } from "./hostedFlag";

/** Hosted gateway phase 2, task 030 (owner-approved, 2026-11-19): a hosted user confirms
 *  their own Hudl or Veo permission before anything is sent to their capture container. The
 *  gateway records it and refuses /helper traffic without it; this mirrors that in the page
 *  so no control appears, and no request is made, before it. */

export type Service = "hudl" | "veo";
export type HostedPermissions = { hudl: boolean; veo: boolean; wording: string };

let current: Record<Service, boolean> = { hudl: false, veo: false };

export function setHostedPermissions(p: { hudl: boolean; veo: boolean }): void {
  current = { hudl: p.hudl, veo: p.veo };
}

export function hostedAllows(service: Service): boolean {
  return current[service];
}

export function serviceOf(url: string): Service {
  return /\/helper\/veo(\/|\?|$)/.test(url) ? "veo" : "hudl";
}

export const PERMISSIONS_KEY = ["hosted-permissions"];

type Raw = { wording?: string; hudl?: { confirmed_at: string | null }; veo?: { confirmed_at: string | null } };

export function useHostedPermissions() {
  return useQuery<HostedPermissions>({
    queryKey: PERMISSIONS_KEY,
    enabled: HOSTED,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const r = await fetch("/_portal/api/connections", { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error("Could not check your Hudl and Veo permission.");
      const d = (await r.json()) as Raw;
      const p = { hudl: Boolean(d.hudl?.confirmed_at), veo: Boolean(d.veo?.confirmed_at), wording: d.wording ?? "" };
      setHostedPermissions(p);
      return p;
    },
  });
}

/** True when the page may talk to the helper for this service: always on the owner's own
 *  install; in a hosted copy only after the user's confirmation. */
export function useHelperEnabled(service: Service): boolean {
  const q = useHostedPermissions();
  return !HOSTED || Boolean(q.data?.[service]);
}

export async function confirmHostedPermission(service: Service): Promise<void> {
  const me = await fetch("/_portal/api/me", { credentials: "same-origin", cache: "no-store" });
  if (!me.ok) throw new Error("Please sign in again.");
  const { csrf_token } = (await me.json()) as { csrf_token: string };
  const r = await fetch(`/_portal/api/connections/${service}/confirm`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf_token },
    body: JSON.stringify({ accepted: true }),
  });
  if (!r.ok) throw new Error("Your confirmation was not saved. Please try again.");
}
