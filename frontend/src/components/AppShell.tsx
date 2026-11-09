import { Clapperboard, FolderInput, Library, PlugZap, Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

// Only screens that work are listed (brief section 19). Layout follows reference 1:
// brand left, pill navigation (active pill labelled and glowing, others round icons), search right.
const NAV = [
  { to: "/", label: "Library", icon: Library, end: true },
  { to: "/import", label: "Import", icon: FolderInput, end: false },
  { to: "/settings/connections", label: "Connections", icon: PlugZap, end: false },
];

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-3" aria-label="Football Memories home">
      <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-accent/30 to-violet/40 ring-1 ring-accent/50 shadow-[0_0_24px_-4px_rgb(34_211_238/0.6)]">
        <Clapperboard size={19} className="text-accent" aria-hidden />
      </span>
      <span className="hidden text-lg font-semibold tracking-tight sm:block">Football Memories</span>
    </NavLink>
  );
}

function PillNav() {
  return (
    <nav aria-label="Main" className="flex items-center gap-2">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={label}
          className={({ isActive }) =>
            isActive
              ? "flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#1d4ed8]/70 to-accent/40 px-5 text-sm font-medium text-fg ring-1 ring-accent/50 shadow-[0_0_28px_-6px_rgb(34_211_238/0.75)]"
              : "grid size-11 place-items-center rounded-full bg-ink-800/80 text-fg-muted ring-1 ring-line transition hover:text-fg hover:ring-accent/40"
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={18} aria-hidden />
              {isActive ? <span>{label}</span> : <span className="sr-only">{label}</span>}
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
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Brand />
          <div className="mx-auto">
            <PillNav />
          </div>
          <GlobalSearch />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
