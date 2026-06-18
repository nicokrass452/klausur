import { Bell, Download, MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { PAGE_TITLES } from "../lib/navigation";
import { requestNotificationPermission } from "../services/notificationService";
import { useAppStore } from "../store/useAppStore";
import { AuthButton } from "./AuthButton";
import { GuestBanner } from "./GuestBanner";
import { MobileNav } from "./MobileNav";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { Sidebar } from "./Sidebar";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { XpBadge } from "./XpBadge";

export function Layout() {
  const location = useLocation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const rewardToast = useAppStore((state) => state.rewardToast);
  const clearRewardToast = useAppStore((state) => state.clearRewardToast);
  const stats = useAppStore((state) => state.stats);
  const theme = useAppStore((state) => state.settings.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  useEffect(() => {
    const handler = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPrompt(promptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] ?? "Klausurdetail";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.08),_transparent_28%)]" />
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{APP_NAME}</p>
                <h2 className="truncate font-display text-xl text-slate-950 dark:text-white md:text-2xl">{pageTitle}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2 md:gap-3">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  aria-label="Theme wechseln"
                >
                  {theme === "dark" ? <SunMedium size={17} /> : <MoonStar size={17} />}
                </button>
                {isAuthenticated ? (
                  <>
                    <button
                      onClick={async () => {
                        const permission = await requestNotificationPermission();
                        updateReminderSettings({ notificationsEnabled: permission === "granted" });
                      }}
                      className="hidden size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-700 md:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      aria-label="Benachrichtigungen"
                    >
                      <Bell size={17} />
                    </button>
                    <button
                      onClick={async () => {
                        if (!installPrompt) return;
                        await installPrompt.prompt();
                        await installPrompt.userChoice;
                        setInstallPrompt(null);
                      }}
                      className="hidden items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white lg:inline-flex dark:bg-teal-500 dark:text-slate-950"
                    >
                      <Download size={15} />
                      Installieren
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

          <main className="mx-auto max-w-6xl px-4 py-5 pb-28 md:px-6 md:py-6 md:pb-8 lg:pb-6">
            {!isAuthenticated ? <GuestBanner /> : null}
            <Outlet />
          </main>
        </div>
      </div>

      {rewardToast ? (
        <button
          onClick={clearRewardToast}
          className="fixed right-4 top-20 z-50 rounded-2xl bg-slate-950 px-4 py-3 text-left text-white shadow-panel dark:bg-teal-500 dark:text-slate-950"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">XP Update</p>
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}