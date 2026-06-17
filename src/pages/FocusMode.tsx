import { PomodoroTimer } from "../components/PomodoroTimer";
import { StatCard } from "../components/StatCard";
import { useAppStore } from "../store/useAppStore";
import { formatMinutes } from "../utils/dateUtils";

export function FocusModePage() {
  const stats = useAppStore((state) => state.stats);
  const addFocusSession = useAppStore((state) => state.addFocusSession);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
      <PomodoroTimer onSessionComplete={(minutes) => addFocusSession(minutes, true)} />
      <section className="space-y-4">
        <StatCard label="Gesamte Fokuszeit" value={formatMinutes(stats.studyTime)} detail="Alle Aufgaben und Fokus-Sessions summiert." />
        <StatCard label="Sessions" value={`${stats.focusSessions.length}`} detail="Abgeschlossene Pomodoro-Einheiten." />
        <StatCard label="Aktueller Streak" value={`${stats.streak} Tage`} detail="XP gibt es nur fuer erledigte Sessions." />
      </section>
    </div>
  );
}
