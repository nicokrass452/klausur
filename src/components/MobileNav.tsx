import type { ComponentType } from "react";
import { LogIn } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import { GUEST_NAV_ITEMS, PRIMARY_NAV_ITEMS } from "../lib/navigation";
import type { TranslationKey } from "../locales/de";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";
import { MobileMoreMenu } from "./MobileMoreMenu";

function NavItem({
  to,
  labelKey,
  language,
  icon: Icon
}: {
  to: string;
  labelKey: TranslationKey;
  language: "de" | "en";
  icon: ComponentType<{ size?: number }>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-pill relative flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-semibold transition ${
          isActive ? "nav-pill--active text-teal-700 dark:text-teal-300" : "text-slate-500"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <span className="nav-pill__indicator" aria-hidden="true" /> : null}
          <Icon size={18} aria-hidden="true" />
          <span className="mt-1 truncate">{t(labelKey, language)}</span>
        </>
      )}
    </NavLink>
  );
}

export function MobileNav() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const language = useAppStore((state) => state.settings.language);

  if (!isAuthenticated) {
    return (
      <nav className="nav-bar fixed inset-x-4 bottom-4 z-40 lg:hidden" aria-label="Navigation">
        <div className="grid grid-cols-2 gap-1 p-1.5">
          {GUEST_NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
                  isActive ? "bg-teal-500/15 text-teal-700 dark:text-teal-300" : "text-slate-600"
                }`
              }
            >
              <Icon size={17} aria-hidden="true" />
              {t(labelKey, language)}
            </NavLink>
          ))}
          <NavLink
            to={ROUTES.signup}
            className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            <LogIn size={17} aria-hidden="true" />
            {t("nav.register", language)}
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="nav-bar fixed inset-x-4 bottom-4 z-40 lg:hidden" aria-label="Navigation">
      <div className="flex items-stretch gap-0.5 p-1.5">
        {PRIMARY_NAV_ITEMS.map(({ to, shortLabelKey, icon }) => (
          <NavItem key={to} to={to} labelKey={shortLabelKey} language={language} icon={icon} />
        ))}
        <MobileMoreMenu />
      </div>
    </nav>
  );
}
