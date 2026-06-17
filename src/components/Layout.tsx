import { Bell, Download, MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { APP_NAME } from "../lib/constants";
import { requestNotificationPermission } from "../services/notificationService";
import { useAppStore } from "../store/useAppStore";
import { AuthButton } from "./AuthButton";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { XpBadge } from "./XpBadge";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/calendar": "Kalender",
  "/exams": "Klausuren",
  "/study-plan": "Lernplan",
  "/focus": "Fokusmodus",
  "/analytics": "Analytics",
  "/settings": "Einstellungen"
};

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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(249,115,22,0.14),_transparent_28%)]">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-white/40 bg-white/60 px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/55 md:px-8">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{APP_NAME}</p>
                <h2 className="mt-1 font-display text-2xl text-slate-950 dark:text-white">{titles[location.pathname] ?? "Klausurdetail"}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                  aria-label="Theme wechseln"
                >
                  {theme === "dark" ? <SunMedium size={18} /> : <MoonStar size={18} />}
                </button>
                <button
                  onClick={async () => {
                    const permission = await requestNotificationPermission();
                    updateReminderSettings({ notificationsEnabled: permission === "granted" });
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/80 text-slate-700 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100"
                  aria-label="Benachrichtigungen"
                >
                  <Bell size={18} />
                </button>
                <button
                  onClick={async () => {
                    if (!installPrompt) return;
                    await installPrompt.prompt();
                    await installPrompt.userChoice;
                    setInstallPrompt(null);
                  }}
                  className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950 md:inline-flex"
                >
                  <Download size={16} />
                  Installieren
                </button>
                {isAuthenticated ? <SyncStatusBadge /> : null}
                <AuthButton />
                <XpBadge xp={stats.xp} level={stats.level} />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 pb-28 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      {rewardToast ? (
        <button
          onClick={clearRewardToast}
          className="fixed right-4 top-24 z-50 rounded-2xl bg-slate-950 px-4 py-3 text-left text-white shadow-panel dark:bg-teal-500 dark:text-slate-950"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">XP Update</p>
          <p className="mt-1 text-sm font-medium">+{rewardToast.amount} XP · {rewardToast.reason}</p>
        </button>
      ) : null}

      <MobileNav />
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
