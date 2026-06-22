import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  BookOpenText,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Settings2,
  Sparkles
} from "lucide-react";
import { ROUTES } from "./constants";

export const PUBLIC_ROUTES = [ROUTES.calendar, ROUTES.login, ROUTES.signup] as const;

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { to: ROUTES.calendar, label: "Kalender", shortLabel: "Kalender", icon: CalendarDays },
  { to: ROUTES.exams, label: "Klausuren", shortLabel: "Klausuren", icon: BookOpenText },
  { to: ROUTES.studyPlan, label: "Lernplan", shortLabel: "Lernplan", icon: Sparkles }
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.coach, label: "AI Trainer", shortLabel: "Coach", icon: Bot },
  { to: ROUTES.focus, label: "Fokusmodus", shortLabel: "Fokus", icon: Clock3 },
  { to: ROUTES.analytics, label: "Analytics", shortLabel: "Stats", icon: BarChart3 },
  { to: ROUTES.settings, label: "Einstellungen", shortLabel: "Mehr", icon: Settings2 }
];

export const AUTHENTICATED_NAV_ITEMS: NavItem[] = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

export const GUEST_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.calendar, label: "Kalender", shortLabel: "Kalender", icon: CalendarDays }
];

export const PAGE_TITLES: Record<string, string> = {
  [ROUTES.dashboard]: "Dashboard",
  [ROUTES.calendar]: "Kalender",
  [ROUTES.exams]: "Klausuren",
  [ROUTES.coach]: "AI Trainer",
  [ROUTES.studyPlan]: "Lernplan",
  [ROUTES.focus]: "Fokusmodus",
  [ROUTES.analytics]: "Analytics",
  [ROUTES.settings]: "Einstellungen"
};

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number]);
}