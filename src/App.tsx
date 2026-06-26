import { useEffect, useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import { useHydratedStore } from "./hooks/useHydratedStore";
import { useNotifications } from "./hooks/useNotifications";
import { useTheme } from "./hooks/useTheme";
import { hasSupabaseEnv } from "./lib/supabase";
import { AppRouter } from "./routes/AppRouter";
import { onAuthStateChange, resolveAuthUser } from "./services/syncService";
import { useAppStore } from "./store/useAppStore";
import { t } from "./lib/i18n";
import { toIsoDate } from "./utils/dateUtils";

export default function App() {
  useTheme();
  useNotifications();
  const hydrated = useHydratedStore();
  const authReady = useAppStore((state) => state.authReady);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const authMode = useAppStore((state) => state.authMode);
  const cloudSyncEnabled = useAppStore((state) => state.settings.cloudSyncEnabled);
  const syncNow = useAppStore((state) => state.syncNow);
  const redistributeMissed = useAppStore((state) => state.redistributeMissed);
  const studyTasks = useAppStore((state) => state.studyTasks);
  const hasAutoRedistributed = useRef(false);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setAuthReady(true);
      return;
    }

    void resolveAuthUser()
      .then((profile) => {
        if (profile || useAppStore.getState().authMode !== "offline-readonly") {
          setAuthSession(profile);
        }
      })
      .catch(() => {
        if (useAppStore.getState().authMode !== "offline-readonly") {
          setAuthSession(null);
        }
      })
      .finally(() => setAuthReady(true));

    const unsubscribe = onAuthStateChange((_session, profile) => {
      setAuthSession(profile);
    });

    return unsubscribe;
  }, [cloudSyncEnabled, setAuthReady, setAuthSession]);

  useEffect(() => {
    const update = () => {
      setOnlineStatus(window.navigator.onLine);
      const store = useAppStore.getState();
      if (window.navigator.onLine && store.isAuthenticated && store.settings.cloudSyncEnabled) {
        store.syncNow();
      }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [setOnlineStatus]);

  useEffect(() => {
    if (isAuthenticated && cloudSyncEnabled && navigator.onLine) {
      void syncNow();
    }
  }, [isAuthenticated, cloudSyncEnabled, syncNow]);

  useEffect(() => {
    if (!hydrated || !authReady || hasAutoRedistributed.current) return;
    if (!isAuthenticated || authMode === "offline-readonly") return;

    const today = toIsoDate(new Date());
    const hasMissedOpenTasks = studyTasks.some(
      (task) => !task.deletedAt && task.status === "open" && task.date < today
    );

    if (hasMissedOpenTasks) {
      redistributeMissed();
    }
    hasAutoRedistributed.current = true;
  }, [hydrated, authReady, isAuthenticated, authMode, studyTasks, redistributeMissed]);

  const language = useAppStore((state) => state.settings.language);

  if (!hydrated || !authReady) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">{t("app.loading", language)}</div>;
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
