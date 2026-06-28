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
import type { TranslationKey } from "../locales/de";
import { ROUTES } from "./constants";

export const PUBLIC_ROUTES = [ROUTES.calendar, ROUTES.login, ROUTES.signup] as const;

export interface NavItem {
  to: string;
  labelKey: TranslationKey;
  shortLabelKey: TranslationKey;
  icon: LucideIcon;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.dashboard, labelKey: "nav.dashboard", shortLabelKey: "nav.dashboard.short", icon: LayoutDashboard },
  { to: ROUTES.calendar, labelKey: "nav.calendar", shortLabelKey: "nav.calendar.short", icon: CalendarDays },
  { to: ROUTES.exams, labelKey: "nav.exams", shortLabelKey: "nav.exams.short", icon: BookOpenText },
  { to: ROUTES.studyPlan, labelKey: "nav.studyPlan", shortLabelKey: "nav.studyPlan.short", icon: Sparkles }
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.coach, labelKey: "nav.coach", shortLabelKey: "nav.coach.short", icon: Bot },
  { to: ROUTES.focus, labelKey: "nav.focus", shortLabelKey: "nav.focus.short", icon: Clock3 },
  { to: ROUTES.analytics, labelKey: "nav.analytics", shortLabelKey: "nav.analytics.short", icon: BarChart3 },
  { to: ROUTES.settings, labelKey: "nav.settings", shortLabelKey: "nav.settings.short", icon: Settings2 }
];

export const AUTHENTICATED_NAV_ITEMS: NavItem[] = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS];

export const GUEST_NAV_ITEMS: NavItem[] = [
  { to: ROUTES.calendar, labelKey: "nav.calendar", shortLabelKey: "nav.calendar.short", icon: CalendarDays }
];

export const PAGE_TITLES: Record<string, TranslationKey> = {
  [ROUTES.dashboard]: "nav.dashboard",
  [ROUTES.calendar]: "nav.calendar",
  [ROUTES.exams]: "nav.exams",
  [ROUTES.coach]: "nav.coach",
  [ROUTES.studyPlan]: "nav.studyPlan",
  [ROUTES.focus]: "nav.focus",
  [ROUTES.analytics]: "nav.analytics",
  [ROUTES.settings]: "nav.settings"
};

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname as (typeof PUBLIC_ROUTES)[number]);
}
