import { Clapperboard, FolderInput, Library, PlugZap } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

// Only screens that work are listed. Add an item when its page is real (brief section 19).
const NAV = [
  { to: "/", label: "Library", icon: Library, end: true },
  { to: "/import", label: "Import", icon: FolderInput, end: false },
  { to: "/settings/connections", label: "Connections", icon: PlugZap, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent/25 to-violet/25 ring-1 ring-accent/40">
        <Clapperboard size={18} className="text-accent" aria-hidden />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Football Memories</p>
        <p className="text-[11px] text-fg-subtle">Private archive</p>
      </div>
    </div>
  );
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? "bg-gradient-to-r from-accent/15 to-violet/10 text-fg ring-1 ring-accent/30"
      : "text-fg-muted hover:bg-ink-700/60 hover:text-fg"
  }`;

export function AppShell() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-line/70 bg-ink-900/60 p-5 backdrop-blur lg:flex lg:flex-col lg:gap-8">
        <Brand />
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={17} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line/70 bg-ink-900/85 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <nav aria-label="Main" className="mt-3 flex gap-1 overflow-x-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={16} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
