import { BarChart3, BookOpenText, CalendarDays, Clock3, LayoutDashboard, Settings2, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../lib/constants";

const navItems = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard },
  { to: ROUTES.calendar, label: "Kalender", icon: CalendarDays },
  { to: ROUTES.exams, label: "Klausuren", icon: BookOpenText },
  { to: ROUTES.studyPlan, label: "Lernplan", icon: Sparkles },
  { to: ROUTES.focus, label: "Fokus", icon: Clock3 },
  { to: ROUTES.analytics, label: "Analytics", icon: BarChart3 },
  { to: ROUTES.settings, label: "Settings", icon: Settings2 }
];

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-white/40 bg-white/55 px-5 py-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/50 lg:flex">
      <div className="rounded-[28px] bg-gradient-to-br from-teal-500 via-cyan-400 to-orange-300 p-5 text-slate-950 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.28em]">Klausurplaner</p>
        <h1 className="mt-4 font-display text-3xl">Lernen mit System</h1>
        <p className="mt-2 text-sm text-slate-900/80">Plane Klausuren, sichere Themen und halte deinen Streak stabil.</p>
      </div>
      <nav className="mt-6 space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-950 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950"
                  : "text-slate-600 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
