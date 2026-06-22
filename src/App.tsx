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
      .then((profile) => setAuthSession(profile))
      .catch(() => setAuthSession(null));

    const unsubscribe = onAuthStateChange((_session, profile) => {
      setAuthSession(profile);
    });

    return unsubscribe;
  }, [cloudSyncEnabled, setAuthReady, setAuthSession]);

  useEffect(() => {
    const update = () => setOnlineStatus(window.navigator.onLine);
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

  if (!hydrated || !authReady) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">Klausurplaner lädt...</div>;
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
