import { CircleUserRound } from "lucide-react";
import { HOSTED } from "../api/helperBase";

/** A hosted family's way back to their gateway account (owner request 2026-11-19). A full
 *  page load: the account page is served by the gateway, outside this app. */
export function HostedAccountLink() {
  if (!HOSTED) return null;
  return (
    <a href="/_portal/account" title="Your account" aria-label="Your account" className="screen-link">
      <CircleUserRound size={18} aria-hidden />
    </a>
  );
}
