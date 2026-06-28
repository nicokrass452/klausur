import { PomodoroTimer } from "../components/PomodoroTimer";
import { StatCard } from "../components/StatCard";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";
import { formatMinutes } from "../utils/dateUtils";

export function FocusModePage() {
  const stats = useAppStore((state) => state.stats);
  const addFocusSession = useAppStore((state) => state.addFocusSession);
  const language = useAppStore((state) => state.settings.language);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
      <PomodoroTimer onSessionComplete={(minutes) => addFocusSession(minutes, true)} />
      <section className="space-y-4">
        <StatCard
          label={t("focus.totalTime", language)}
          value={formatMinutes(stats.studyTime)}
          detail={t("focus.totalTimeDesc", language)}
        />
        <StatCard
          label={t("focus.sessions", language)}
          value={`${stats.focusSessions.length}`}
          detail={t("focus.sessionsDesc", language)}
        />
        <StatCard
          label={t("focus.currentStreak", language)}
          value={`${stats.streak} ${t("common.days", language)}`}
          detail={t("focus.streakDesc", language)}
        />
      </section>
    </div>
  );
}
