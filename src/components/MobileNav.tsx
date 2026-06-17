import { BarChart3, BookOpenText, CalendarDays, Clock3, LayoutDashboard, Settings2, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../lib/constants";

const navItems = [
  { to: ROUTES.dashboard, label: "Home", icon: LayoutDashboard },
  { to: ROUTES.calendar, label: "Kal", icon: CalendarDays },
  { to: ROUTES.exams, label: "Klaus", icon: BookOpenText },
  { to: ROUTES.focus, label: "Fokus", icon: Clock3 },
  { to: ROUTES.analytics, label: "Stats", icon: BarChart3 },
  { to: ROUTES.studyPlan, label: "Plan", icon: Sparkles },
  { to: ROUTES.settings, label: "Mehr", icon: Settings2 }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[28px] border border-white/60 bg-white/85 p-2 shadow-panel backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/85 lg:hidden">
      <div className="grid grid-cols-7 gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center rounded-2xl text-[11px] font-semibold ${
                isActive ? "bg-slate-950 text-white dark:bg-teal-500 dark:text-slate-950" : "text-slate-500"
              }`
            }
          >
            <Icon size={16} />
            <span className="mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
