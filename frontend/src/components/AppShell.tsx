import { useHudlAutoCheck } from "./hudl/useHudlAutoCheck";
import { Film, FolderInput, HardDriveDownload, Library, Search, Settings, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Brand } from "./BrandMark";
import { UpdateBadge } from "./settings/UpdateSettings";

// Only screens that work are listed (brief section 19). Layout follows reference 1:
// brand left, pill navigation (active pill labelled and glowing, others round icons), search right.
const NAV = [
  { to: "/", label: "Library", icon: Library, end: true },
  { to: "/clips", label: "Clips", icon: Film, end: false },
  { to: "/downloaded", label: "Downloaded", icon: HardDriveDownload, end: false },
  { to: "/player", label: "My Player", icon: UserRound, end: false },
  { to: "/import", label: "Import", icon: FolderInput, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

function PillNav() {
  return (
    <nav aria-label="Main" className="screen-navigation flex items-center gap-1.5 sm:gap-2">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={label}
          className={({ isActive }) => `screen-link ${isActive ? "is-active" : ""}`}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} aria-hidden />
              <span className={isActive ? "nav-label active-label" : "nav-label"}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : "/");
  };
  return (
    <form role="search" onSubmit={submit} className="relative hidden md:block">
      <label className="sr-only" htmlFor="global-search">
        Search matches
      </label>
      <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
      <input
        id="global-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search matches"
        className="h-11 w-64 rounded-full border border-line bg-ink-800/80 pr-4 pl-10 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
      />
    </form>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  useHudlAutoCheck();
  const screen = pathname.startsWith("/player") ? "profile"
    : (pathname.startsWith("/matches/") || pathname.startsWith("/hudl/")) || pathname.startsWith("/clips") ? "analysis"
    : pathname === "/" ? "dashboard" : "settings";
  return (
    <div className="app-surface min-h-screen" data-screen={screen}>
      <header className="app-header sticky top-0 z-30">
        <div className="header-inner">
          <Brand />
          <div className="nav-wrap">
            <PillNav />
          </div>
          <UpdateBadge />
          <GlobalSearch />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
