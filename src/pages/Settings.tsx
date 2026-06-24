import { useNavigate } from "react-router-dom";
import { SegmentedControl } from "../components/SegmentedControl";
import { ROUTES } from "../lib/constants";
import { requestNotificationPermission } from "../services/notificationService";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useAppStore((state) => state.settings);
  const user = useAppStore((state) => state.user);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);
  const syncError = useAppStore((state) => state.syncError);
  const isOnline = useAppStore((state) => state.isOnline);
  const pendingWriteCount = useAppStore((state) => state.pendingWriteCount);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const setTheme = useAppStore((state) => state.setTheme);
  const setDefaultDailyMinutes = useAppStore((state) => state.setDefaultDailyMinutes);
  const enableCloudSync = useAppStore((state) => state.enableCloudSync);
  const syncNow = useAppStore((state) => state.syncNow);
  const logout = useAppStore((state) => state.logout);
  const resetTutorial = useAppStore((state) => state.resetTutorial);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="font-display text-2xl text-slate-950 dark:text-white">Darstellung</h3>
        <div className="mt-5">
          <SegmentedControl
            value={settings.theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Hell" },
              { value: "dark", label: "Dunkel" },
              { value: "system", label: "System" }
            ]}
          />
        </div>

        <h3 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">Einführung</h3>
        <p className="mt-2 text-sm text-slate-500">
          {settings.tutorialCompleted ? "Du hast die Einführung abgeschlossen." : "Die Einführung wird beim nächsten Seitenaufruf angezeigt."}
        </p>
        <button
          onClick={() => {
            resetTutorial();
            navigate(ROUTES.dashboard);
          }}
          className="mt-4 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Einführung erneut starten
        </button>

        <h3 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">Erinnerungen</h3>
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Tägliche Lernreminder</span>
            <input type="checkbox" checked={settings.reminders.dailyReminder} onChange={(event) => updateReminderSettings({ dailyReminder: event.target.checked })} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Heute-lernen Hinweis</span>
            <input type="checkbox" checked={settings.reminders.todayLearningReminder} onChange={(event) => updateReminderSettings({ todayLearningReminder: event.target.checked })} />
          </label>
          <button
            onClick={async () => {
              const permission = await requestNotificationPermission();
              updateReminderSettings({ notificationsEnabled: permission === "granted" });
            }}
            className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            Push Notifications aktivieren
          </button>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="font-display text-2xl text-slate-950 dark:text-white">Daten & Sync</h3>
        <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Standard-Lernzeit
          <input className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950" type="number" min="15" step="5" value={settings.defaultDailyMinutes} onChange={(event) => setDefaultDailyMinutes(Number(event.target.value))} />
        </label>

        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Supabase Cloud Sync</p>
              <p className="text-sm text-slate-500">{user?.email ?? "Nicht angemeldet"}</p>
            </div>
            <input type="checkbox" checked={settings.cloudSyncEnabled} onChange={(event) => void enableCloudSync(event.target.checked)} />
          </div>
          <button
            onClick={() => void syncNow()}
            disabled={!isOnline}
            className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
          >
            Jetzt synchronisieren
          </button>
          <p className="text-sm text-slate-500">Status: {syncStatus}</p>
          <p className="text-sm text-slate-500">Vorgemerkte Offline-Aenderungen: {pendingWriteCount}</p>
          {!isOnline ? <p className="text-sm text-amber-600 dark:text-amber-300">Offline: Aenderungen werden lokal vorgemerkt und spaeter synchronisiert.</p> : null}
          <p className="text-sm text-slate-500">Letzter Sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("de-DE") : "-"}</p>
          {syncError ? <p className="text-sm text-rose-600 dark:text-rose-300">{syncError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void logout()}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Logout
            </button>
            <button
              onClick={async () => {
                const { resetPasswordForEmail } = await import("../services/syncService");
                if (user?.email) {
                  try {
                    await resetPasswordForEmail(user.email);
                    alert("Passwort-Reset-E-Mail gesendet!");
                  } catch (e: any) {
                    alert(e.message);
                  }
                }
              }}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Passwort zurücksetzen
            </button>
            <button
              onClick={async () => {
                if (confirm("Möchtest du deinen Account und alle Daten wirklich dauerhaft löschen?")) {
                  const { deleteUserAccount } = await import("../services/syncService");
                  try {
                    await deleteUserAccount();
                    navigate(ROUTES.login);
                  } catch (e: any) {
                    alert("Fehler beim Löschen: " + e.message);
                  }
                }
              }}
              className="rounded-full bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
            >
              Account löschen
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
