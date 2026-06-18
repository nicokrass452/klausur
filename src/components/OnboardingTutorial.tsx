import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TUTORIAL_STEPS } from "../lib/tutorialSteps";
import { useAppStore } from "../store/useAppStore";

export function OnboardingTutorial() {
  const tutorialCompleted = useAppStore((state) => state.settings.tutorialCompleted);
  const completeTutorial = useAppStore((state) => state.completeTutorial);
  const [stepIndex, setStepIndex] = useState(0);
  const wasCompleted = useRef(tutorialCompleted);
  const navigate = useNavigate();

  useEffect(() => {
    if (wasCompleted.current && !tutorialCompleted) {
      setStepIndex(0);
    }
    wasCompleted.current = tutorialCompleted;
  }, [tutorialCompleted]);

  const step = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (tutorialCompleted || !step) return;
    navigate(step.route, { replace: true });
  }, [navigate, step, stepIndex, tutorialCompleted]);

  if (tutorialCompleted || !step) return null;

  const Icon = step.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="w-full max-w-lg rounded-[32px] border border-white/20 bg-white p-6 shadow-panel dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Einfuehrung {stepIndex + 1} / {TUTORIAL_STEPS.length}
          </p>
          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((entry, index) => (
              <span
                key={entry.id}
                className={`h-2 w-2 rounded-full transition ${index <= stepIndex ? "bg-teal-500" : "bg-slate-200 dark:bg-slate-700"}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 inline-flex size-14 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-400 to-orange-300 text-slate-950">
          <Icon size={26} />
        </div>

        <h2 id="tutorial-title" className="mt-5 font-display text-3xl text-slate-950 dark:text-white">
          {step.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.summary}</p>

        <ul className="mt-5 space-y-2">
          {step.details.map((detail) => (
            <li key={detail} className="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal-500" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
          >
            <ChevronLeft size={16} />
            Zurueck
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                completeTutorial();
                return;
              }
              setStepIndex((value) => Math.min(TUTORIAL_STEPS.length - 1, value + 1));
            }}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            {isLast ? "Los geht's" : "Weiter"}
            {!isLast ? <ChevronRight size={16} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}