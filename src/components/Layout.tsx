import { Bell, MoonStar, SunMedium } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { PAGE_TITLES } from "../lib/navigation";
import { t } from "../lib/i18n";
import { requestNotificationPermission } from "../services/notificationService";
import { useAppStore } from "../store/useAppStore";
import { AuthButton } from "./AuthButton";
import { GuestBanner } from "./GuestBanner";
import { InstallPromptBanner } from "./InstallPromptBanner";
import { MobileNav } from "./MobileNav";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { Sidebar } from "./Sidebar";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { XpBadge } from "./XpBadge";

export function Layout() {
  const location = useLocation();
  const rewardToast = useAppStore((state) => state.rewardToast);
  const clearRewardToast = useAppStore((state) => state.clearRewardToast);
  const stats = useAppStore((state) => state.stats);
  const theme = useAppStore((state) => state.settings.theme);
  const language = useAppStore((state) => state.settings.language);
  const setTheme = useAppStore((state) => state.setTheme);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authMode = useAppStore((state) => state.authMode);
  const isOfflineReadOnly = authMode === "offline-readonly";

  const pageTitleKey = PAGE_TITLES[location.pathname];
  const pageTitle = pageTitleKey ? t(pageTitleKey, language) : t("exam.detail", language);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-teal-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-slate-950"
      >
        {t("action.skip", language)}
      </a>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_28%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t("app.name", language)}</p>
                <h2 className="truncate font-display text-xl text-slate-950 dark:text-white md:text-2xl">{pageTitle}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2 md:gap-3">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  disabled={isOfflineReadOnly}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  aria-label={t("layout.toggleTheme", language)}
                >
                  {theme === "dark" ? <SunMedium size={17} aria-hidden="true" /> : <MoonStar size={17} aria-hidden="true" />}
                </button>
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={async () => {
                        const permission = await requestNotificationPermission();
                        updateReminderSettings({ notificationsEnabled: permission === "granted" });
                      }}
                      disabled={isOfflineReadOnly}
                      className="hidden size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 md:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      aria-label={t("layout.notifications", language)}
                    >
                      <Bell size={17} aria-hidden="true" />
                    </button>
                    <SyncStatusBadge />
                    <div className="md:hidden">
                      <XpBadge xp={stats.xp} level={stats.level} compact />
                    </div>
                    <div className="hidden md:block">
                      <XpBadge xp={stats.xp} level={stats.level} />
                    </div>
                  </>
                ) : null}
                <AuthButton />
              </div>
            </div>
          </header>

          <main id="main-content" className="mx-auto max-w-6xl px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-8 lg:pb-6">
            {!isAuthenticated ? <GuestBanner /> : null}
            {isAuthenticated ? <InstallPromptBanner /> : null}
            {isOfflineReadOnly ? (
              <div
                className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                role="status"
                aria-live="polite"
              >
                {t("layout.offlineReadOnly", language)}
              </div>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>

      {rewardToast ? (
        <button
          onClick={clearRewardToast}
          className="fixed right-4 top-20 z-50 rounded-2xl bg-slate-950 px-4 py-3 text-left text-white shadow-panel dark:bg-teal-500 dark:text-slate-950"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">{t("layout.xpUpdate", language)}</p>
          <p className="mt-1 text-sm font-medium">
            +{rewardToast.amount} XP · {rewardToast.reason}
          </p>
        </button>
      ) : null}

      <MobileNav />
      {isAuthenticated ? <OnboardingTutorial /> : null}
    </div>
  );
}
