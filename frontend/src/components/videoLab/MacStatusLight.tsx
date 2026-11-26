import { useQuery } from "@tanstack/react-query";
import { VIDEO_LAB_BASE } from "../../api/videoLabEndpoint";

/** Admin only (granted users never touch /_admin). Green when the gateway's fresh worker heartbeat says the MacBook node is ready; red otherwise. */
export function MacStatusLight() {
  const admin = VIDEO_LAB_BASE.startsWith("/_admin/");
  const nodes = useQuery({ queryKey: ["video-lab-mac-status"], enabled: admin, retry: false, refetchInterval: 15000,
    queryFn: async () => {
      const r = await fetch("/_admin/api/video-nodes", { credentials: "same-origin", cache: "no-store" });
      if (!r.ok) throw new Error("status unavailable");
      return await r.json() as { remote_ready?: unknown };
    },
  });
  if (!admin || nodes.isPending) return null;
  const on = nodes.data?.remote_ready === true;
  const label = nodes.isError ? "MacBook Pro status unavailable" : on ? "MacBook Pro connected" : "MacBook Pro not connected";
  return <div role="status" aria-label={label} title={label}
    className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-fg-muted">
    <span data-light={on ? "on" : "off"} aria-hidden
      className={`h-2.5 w-2.5 rounded-full ${on ? "bg-ok shadow-[0_0_8px_var(--color-ok)]" : "bg-danger shadow-[0_0_8px_var(--color-danger)]"}`} />
    MacBook Pro
  </div>;
}
