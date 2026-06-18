import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { SECONDARY_NAV_ITEMS } from "../lib/navigation";

export function MobileMoreMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-2 text-[11px] font-semibold ${
          open ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-500"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={18} />
        <span className="mt-1">Mehr</span>
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Menue schliessen" onClick={() => setOpen(false)} />
          <div className="absolute bottom-[calc(100%+0.5rem)] right-0 z-50 min-w-44 rounded-2xl border border-white/60 bg-white/95 p-2 shadow-panel backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/95">
            {SECONDARY_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950"
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