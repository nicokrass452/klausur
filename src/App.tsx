import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useHydratedStore } from "./hooks/useHydratedStore";
import { useNotifications } from "./hooks/useNotifications";
import { useTheme } from "./hooks/useTheme";
import { hasSupabaseEnv } from "./lib/supabase";
import { AppRouter } from "./routes/AppRouter";
import { onAuthStateChange, resolveAuthUser } from "./services/syncService";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  useTheme();
  useNotifications();
  const hydrated = useHydratedStore();
  const authReady = useAppStore((state) => state.authReady);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const setOnlineStatus = useAppStore((state) => state.setOnlineStatus);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const cloudSyncEnabled = useAppStore((state) => state.settings.cloudSyncEnabled);
  const syncNow = useAppStore((state) => state.syncNow);

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
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Only show prompt logic could be added here later (e.g. state.setInstallPromptEvent(e))
      // Currently, it holds the event. In a full implementation, you'd save `e` to a global state
      // and show a custom install button.
      (window as any).deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!hydrated || !authReady) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">Klausurplaner lädt...</div>;
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
