import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useHydratedStore } from "./hooks/useHydratedStore";
import { useNotifications } from "./hooks/useNotifications";
import { useTheme } from "./hooks/useTheme";
import { hasSupabaseEnv } from "./lib/supabase";
import { AppRouter } from "./routes/AppRouter";
import { getSession, onAuthStateChange } from "./services/syncService";
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

    void getSession()
      .then((session) => {
        setAuthSession(
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email,
                fullName: (session.user.user_metadata.full_name as string | undefined) ?? (session.user.user_metadata.name as string | undefined),
                avatarUrl: session.user.user_metadata.avatar_url as string | undefined,
                provider: session.user.app_metadata.provider as string | undefined,
                cloudSyncEnabled,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            : null
        );
      })
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
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-white">Klausurplaner laedt...</div>;
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
