import { LogIn } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { AUTHENTICATED_NAV_ITEMS, GUEST_NAV_ITEMS } from "../lib/navigation";
import { useAppStore } from "../store/useAppStore";

export function Sidebar() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const navItems = isAuthenticated ? AUTHENTICATED_NAV_ITEMS : GUEST_NAV_ITEMS;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/70 px-4 py-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/60 lg:flex">
      <div className="px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Klausurplaner</p>
        <h1 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">Lernen mit System</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAuthenticated ? "Cloud-Sync, KI-Coach und persönlicher Lernplan." : "Melde dich an, um alle Funktionen zu nutzen."}
        </p>
      </div>

      <nav className="mt-8 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {!isAuthenticated ? (
        <div className="mt-auto rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Account erforderlich</p>
          <p className="mt-1 text-sm text-slate-500">Lernplan, Coach und Statistiken sind nach dem Login verfügbar.</p>
          <NavLink
            to={ROUTES.signup}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            <LogIn size={16} />
            Registrieren
          </NavLink>
        </div>
      ) : null}
    </aside>
  );
}