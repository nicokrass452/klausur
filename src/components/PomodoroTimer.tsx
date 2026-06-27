import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { POMODORO_BREAK_MINUTES, POMODORO_FOCUS_MINUTES } from "../lib/constants";
import { t } from "../lib/i18n";
import { useAppStore } from "../store/useAppStore";

interface PomodoroTimerProps {
  onSessionComplete: (minutes: number) => void;
}

export function PomodoroTimer({ onSessionComplete }: PomodoroTimerProps) {
  const language = useAppStore((state) => state.settings.language);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(POMODORO_FOCUS_MINUTES * 60);

  useEffect(() => {
    if (!running) return;
    const handle = window.setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(handle);
  }, [running]);

  useEffect(() => {
    if (seconds > 0) return;
    if (mode === "focus") {
      onSessionComplete(POMODORO_FOCUS_MINUTES);
      setMode("break");
      setSeconds(POMODORO_BREAK_MINUTES * 60);
    } else {
      setMode("focus");
      setSeconds(POMODORO_FOCUS_MINUTES * 60);
    }
  }, [seconds, mode, onSessionComplete]);

  const reset = () => {
    setRunning(false);
    setMode("focus");
    setSeconds(POMODORO_FOCUS_MINUTES * 60);
  };

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  const progress = mode === "focus"
    ? ((POMODORO_FOCUS_MINUTES * 60 - seconds) / (POMODORO_FOCUS_MINUTES * 60)) * 100
    : ((POMODORO_BREAK_MINUTES * 60 - seconds) / (POMODORO_BREAK_MINUTES * 60)) * 100;
  const label = mode === "focus" ? t("focus.title", language) : t("focus.break", language);

  return (
    <section
      className="surface-card p-8 text-center"
      role="timer"
      aria-live="off"
      aria-label={`${label} — ${minutes}:${rest}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400" aria-hidden="true">
        {label}
      </p>
      <div className="mt-5 font-display text-6xl tabular-nums text-slate-950 dark:text-white md:text-7xl" aria-hidden="true">
        {minutes}:{rest}
      </div>
      <div className="mx-auto mt-6 max-w-xs">
        <div
          className="progress-track h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-400 via-teal-500 to-cyan-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setRunning(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
        >
          <Play size={16} aria-hidden="true" />
          {t("focus.start", language)}
        </button>
        <button
          onClick={() => setRunning(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          <Pause size={16} aria-hidden="true" />
          {t("focus.pause", language)}
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          <RotateCcw size={16} aria-hidden="true" />
          {t("focus.reset", language)}
        </button>
      </div>
    </section>
  );
}
