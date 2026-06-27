import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { SECONDARY_NAV_ITEMS } from "../lib/navigation";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

export function MobileMoreMenu() {
  const [open, setOpen] = useState(false);
  const language = useAppStore((state) => state.settings.language);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === "Tab" && menuRef.current) {
        const focusables = menuRef.current.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    firstItemRef.current?.focus();
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className="relative flex-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`nav-pill relative flex min-h-14 w-full flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-semibold transition ${
          open ? "nav-pill--active text-teal-700 dark:text-teal-300" : "text-slate-500"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="mobile-more-menu"
        aria-label={t("nav.more", language)}
      >
        {open ? <span className="nav-pill__indicator" aria-hidden="true" /> : null}
        <MoreHorizontal size={18} aria-hidden="true" />
        <span className="mt-1">{t("nav.more", language)}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label={t("nav.closeMenu", language)}
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div
            ref={menuRef}
            id="mobile-more-menu"
            role="menu"
            aria-label={t("nav.more", language)}
            className="nav-bar absolute bottom-[calc(100%+0.5rem)] right-0 z-50 min-w-48 p-2"
          >
            {SECONDARY_NAV_ITEMS.map(({ to, labelKey, icon: Icon }, index) => (
              <NavLink
                key={to}
                ref={index === 0 ? firstItemRef : undefined}
                to={to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                  }`
                }
              >
                <Icon size={16} aria-hidden="true" />
                {t(labelKey, language)}
              </NavLink>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
