import { LogIn } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { GUEST_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "../lib/navigation";
import { useAppStore } from "../store/useAppStore";
import { MobileMoreMenu } from "./MobileMoreMenu";

export function MobileNav() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <nav className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-panel backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        <div className="grid grid-cols-2 gap-1">
          {GUEST_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
                  isActive ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-600"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          <NavLink
            to={ROUTES.login}
            className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            <LogIn size={17} />
            Anmelden
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-panel backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
      <div className="flex items-stretch gap-1">
        {PRIMARY_NAV_ITEMS.map(({ to, shortLabel, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold ${
                isActive ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-500"
              }`
            }
          >
            <Icon size={17} />
            <span className="mt-1 truncate">{shortLabel}</span>
          </NavLink>
        ))}
        <MobileMoreMenu />
      </div>
    </nav>
  );
}