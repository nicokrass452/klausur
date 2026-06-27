import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

export function AppLoader() {
  const language = useAppStore((state) => state.settings.language);
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label={t("app.loading", language)}>
      <span className="sr-only">{t("app.loading", language)}</span>
      <section className="surface-card p-6">
        <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="surface-card h-32 animate-pulse"
          />
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="surface-card h-72 animate-pulse"
          />
        ))}
      </section>
    </div>
  );
}
