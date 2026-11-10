import { ArrowUpCircle, HardDrive, PlugZap, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/settings", label: "Playback", icon: SlidersHorizontal, end: true },
  { to: "/settings/storage", label: "Storage", icon: HardDrive, end: false },
  { to: "/settings/backups", label: "Backups", icon: ShieldCheck, end: false },
  { to: "/settings/connections", label: "Connections", icon: PlugZap, end: false },
  { to: "/settings/update", label: "Update", icon: ArrowUpCircle, end: false },
];

export function SettingsLayout() {
  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-accent uppercase">Settings</p>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </header>
      <nav aria-label="Settings sections" className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-ink-900/70 p-1">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                isActive ? "bg-gradient-to-r from-[#2563eb] to-accent-strong text-white" : "text-fg-muted hover:text-fg"
              }`
            }
          >
            <Icon size={15} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
