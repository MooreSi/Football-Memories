import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { HOSTED } from "../api/hostedFlag";

/** The gateway admin's way into the admin console from their own library (owner request
 *  2026-11-19, gateway docs/PLAN_ADMIN_LIBRARY.md). Only a hosted copy has a gateway; it asks
 *  the gateway (same origin) who is signed in and shows the button to the admin only. The
 *  admin API checks the role itself, so this is the way there, not the guard. */
export function HostedAdminLink() {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (!HOSTED) return;
    let live = true;
    fetch("/_portal/api/me", { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { role?: string } | null) => { if (live) setAdmin(me?.role === "admin"); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!HOSTED || !admin) return null;
  // A full page load: the admin console is served by the gateway, outside this app.
  return (
    <a href="/_portal/admin" title="Admin console" aria-label="Admin console" className="screen-link">
      <ShieldCheck size={18} aria-hidden />
      <span className="nav-label" aria-hidden>Admin</span>
    </a>
  );
}
