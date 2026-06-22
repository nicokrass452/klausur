import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { SECONDARY_NAV_ITEMS } from "../lib/navigation";

export function MobileMoreMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`nav-pill relative flex min-h-14 w-full flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-semibold transition ${
          open ? "nav-pill--active text-teal-700 dark:text-teal-300" : "text-slate-500"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {open ? <span className="nav-pill__indicator" aria-hidden /> : null}
        <MoreHorizontal size={18} />
        <span className="mt-1">Mehr</span>
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Menü schließen" onClick={() => setOpen(false)} />
          <div className="nav-bar absolute bottom-[calc(100%+0.5rem)] right-0 z-50 min-w-48 p-2">
            {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}