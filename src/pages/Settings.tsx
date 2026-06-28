import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SegmentedControl } from "../components/SegmentedControl";
import { ROUTES } from "../lib/constants";
import { OFFLINE_READONLY_ENABLED } from "../lib/offlineFeatureFlag";
import { t } from "../lib/i18n";
import { requestNotificationPermission } from "../services/notificationService";
import { isPushSupported, subscribeUserToPush, unsubscribeFromPush, VAPID_PUBLIC_KEY } from "../services/pushService";
import { useAppStore } from "../store/useAppStore";

export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useAppStore((state) => state.settings);
  const language = useAppStore((state) => state.settings.language);
  const user = useAppStore((state) => state.user);
  const syncStatus = useAppStore((state) => state.syncStatus);
  const lastSyncedAt = useAppStore((state) => state.lastSyncedAt);
  const syncError = useAppStore((state) => state.syncError);
  const isOnline = useAppStore((state) => state.isOnline);
  const pendingWriteCount = useAppStore((state) => state.pendingWriteCount);
  const updateReminderSettings = useAppStore((state) => state.updateReminderSettings);
  const setTheme = useAppStore((state) => state.setTheme);
  const setDefaultDailyMinutes = useAppStore((state) => state.setDefaultDailyMinutes);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const enableCloudSync = useAppStore((state) => state.enableCloudSync);
  const syncNow = useAppStore((state) => state.syncNow);
  const logout = useAppStore((state) => state.logout);
  const resetTutorial = useAppStore((state) => state.resetTutorial);
  const enableOfflineReadOnlyAccess = useAppStore((state) => state.enableOfflineReadOnlyAccess);
  const isOfflineReadOnly = useAppStore((state) => state.authMode === "offline-readonly");
  const [offlineSetupStatus, setOfflineSetupStatus] = useState<string | undefined>();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("settings.theme", language)}</h3>
        <div className="mt-5">
          <SegmentedControl
            value={settings.theme}
            onChange={(value) => {
              if (!isOfflineReadOnly) setTheme(value);
            }}
            options={[
              { value: "light", label: t("settings.themeLight", language) },
              { value: "dark", label: t("settings.themeDark", language) },
              { value: "system", label: t("settings.themeSystem", language) }
            ]}
          />
        </div>

        <h3 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">{t("settings.language", language)}</h3>
        <div className="mt-5">
          <SegmentedControl
            value={settings.language}
            onChange={(value) => {
              if (!isOfflineReadOnly) setLanguage(value as "de" | "en");
            }}
            options={[
              { value: "de", label: t("settings.language.de", language) },
              { value: "en", label: t("settings.language.en", language) }
            ]}
          />
        </div>

        <h3 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">{t("settings.tutorial", language)}</h3>
        <p className="mt-2 text-sm text-slate-500">
          {settings.tutorialCompleted ? t("settings.tutorialCompleted", language) : "Die Einführung wird beim nächsten Seitenaufruf angezeigt."}
        </p>
        <button
          onClick={() => {
            if (isOfflineReadOnly) return;
            resetTutorial();
            navigate(ROUTES.dashboard);
          }}
          disabled={isOfflineReadOnly}
          className="mt-4 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          {t("settings.tutorialRestart", language)}
        </button>

        <h3 className="mt-8 font-display text-2xl text-slate-950 dark:text-white">{t("settings.reminders", language)}</h3>
        <div className="mt-5 space-y-4">
          <label htmlFor="settings-daily-reminder" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("settings.dailyReminder", language)}</span>
            <input id="settings-daily-reminder" disabled={isOfflineReadOnly} type="checkbox" checked={settings.reminders.dailyReminder} onChange={(event) => updateReminderSettings({ dailyReminder: event.target.checked })} />
          </label>
          <label htmlFor="settings-today-reminder" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t("settings.todayReminder", language)}</span>
            <input id="settings-today-reminder" disabled={isOfflineReadOnly} type="checkbox" checked={settings.reminders.todayLearningReminder} onChange={(event) => updateReminderSettings({ todayLearningReminder: event.target.checked })} />
          </label>
          <button
            onClick={async () => {
              if (isOfflineReadOnly) return;
              const permission = await requestNotificationPermission();
              updateReminderSettings({ notificationsEnabled: permission === "granted" });
            }}
            disabled={isOfflineReadOnly}
            className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
          >
            {t("settings.notifications", language)}
          </button>
          {VAPID_PUBLIC_KEY && isPushSupported() ? (
            <button
              onClick={async () => {
                if (isOfflineReadOnly) return;
                try {
                  await subscribeUserToPush();
                  updateReminderSettings({ notificationsEnabled: true });
                } catch (error) {
                  alert(error instanceof Error ? error.message : "Push-Abonnement fehlgeschlagen.");
                }
              }}
              disabled={isOfflineReadOnly}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {t("settings.enablePush", language)}
            </button>
          ) : null}
          {VAPID_PUBLIC_KEY && isPushSupported() ? (
            <button
              onClick={async () => {
                if (isOfflineReadOnly) return;
                await unsubscribeFromPush();
                updateReminderSettings({ notificationsEnabled: false });
              }}
              disabled={isOfflineReadOnly}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {t("settings.disablePush", language)}
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="font-display text-2xl text-slate-950 dark:text-white">{t("settings.dataSync", language)}</h3>
        <label htmlFor="settings-default-minutes" className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-200">
          {t("settings.defaultDailyMinutes", language)}
          <input id="settings-default-minutes" disabled={isOfflineReadOnly} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950" type="number" min="15" step="5" value={settings.defaultDailyMinutes} onChange={(event) => setDefaultDailyMinutes(Number(event.target.value))} />
        </label>

        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200/80 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p id="cloud-sync-label" className="text-sm font-semibold text-slate-900 dark:text-white">{t("settings.cloudSync", language)}</p>
              <p className="text-sm text-slate-500">{user?.email ?? t("settings.notLoggedIn", language)}</p>
            </div>
            <input id="cloud-sync-checkbox" disabled={isOfflineReadOnly} type="checkbox" aria-labelledby="cloud-sync-label" checked={settings.cloudSyncEnabled} onChange={(event) => void enableCloudSync(event.target.checked)} />
          </div>
          {OFFLINE_READONLY_ENABLED && user?.source === "online" ? (
            <div className="rounded-2xl border border-slate-200/80 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Offline Read-Only Access</p>
              <button
                onClick={async () => {
                  setOfflineSetupStatus(undefined);
                  try {
                    await enableOfflineReadOnlyAccess();
                    setOfflineSetupStatus("Offline-Zugriff wurde fuer diesen Browser eingerichtet.");
                  } catch (error) {
                    setOfflineSetupStatus(error instanceof Error ? error.message : "Offline-Zugriff konnte nicht eingerichtet werden.");
                  }
                }}
                disabled={isOfflineReadOnly || !isOnline}
                className="mt-3 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                {t("settings.setupOffline", language)}
              </button>
              {offlineSetupStatus ? <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-500">{offlineSetupStatus}</p> : null}
            </div>
          ) : null}
          <button
            onClick={() => void syncNow()}
            disabled={!isOnline || isOfflineReadOnly}
            className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
          >
            {t("settings.syncNow", language)}
          </button>
          <p className="text-sm text-slate-500">{t("settings.status", language)}: {syncStatus}</p>
          <p className="text-sm text-slate-500">{t("settings.pendingWrites", language)}: {pendingWriteCount}</p>
          {!isOnline ? <p role="status" aria-live="polite" className="text-sm text-amber-600 dark:text-amber-300">{t("settings.offline", language)}</p> : null}
          <p className="text-sm text-slate-500">{t("settings.lastSync", language)}: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString(language === "en" ? "en-US" : "de-DE") : "-"}</p>
          {syncError ? (
            <p className="text-sm text-rose-600 dark:text-rose-300" role="status" aria-live="polite">
              {syncError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void logout()}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {t("settings.logout", language)}
            </button>
            <button
              onClick={async () => {
                if (isOfflineReadOnly) return;
                const { resetPasswordForEmail } = await import("../services/syncService");
                if (user?.email) {
                  try {
                    await resetPasswordForEmail(user.email);
                    alert(t("settings.passwordResetSent", language));
                  } catch (e: any) {
                    alert(e.message);
                  }
                }
              }}
              disabled={isOfflineReadOnly}
              className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              {t("settings.resetPassword", language)}
            </button>
            <button
              onClick={async () => {
                if (confirm("Möchtest du deinen Account und alle Daten wirklich dauerhaft löschen?")) {
                  const { deleteUserAccount } = await import("../services/syncService");
                  try {
                    await deleteUserAccount();
                    navigate(ROUTES.login);
                  } catch (e: any) {
                    alert(`${t("settings.deleteError", language)}: ${e.message}`);
                  }
                }
              }}
              disabled={isOfflineReadOnly}
              className="rounded-full bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-600 disabled:opacity-50 dark:bg-rose-900/40 dark:text-rose-400"
            >
              {t("settings.deleteAccount", language)}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
