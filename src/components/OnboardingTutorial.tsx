import { ChevronLeft, ChevronRight, Lightbulb, MousePointer2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TUTORIAL_STEPS } from "../lib/tutorialSteps";
import { useAppStore } from "../store/useAppStore";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_GAP = 10;
const TOOLTIP_WIDTH = 400;
const VIEWPORT_GAP = 16;

function getSpotlightRect(element: Element): SpotlightRect {
  const rect = element.getBoundingClientRect();
  const left = Math.max(VIEWPORT_GAP, rect.left - SPOTLIGHT_GAP);
  const top = Math.max(VIEWPORT_GAP, rect.top - SPOTLIGHT_GAP);
  return {
    left,
    top,
    width: Math.min(window.innerWidth - left - VIEWPORT_GAP, rect.width + SPOTLIGHT_GAP * 2),
    height: Math.min(window.innerHeight - top - VIEWPORT_GAP, rect.height + SPOTLIGHT_GAP * 2)
  };
}

export function OnboardingTutorial() {
  const tutorialCompleted = useAppStore((state) => state.settings.tutorialCompleted);
  const completeTutorial = useAppStore((state) => state.completeTutorial);
  const language = useAppStore((state) => state.settings.language);
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [targetReady, setTargetReady] = useState(false);
  const wasCompleted = useRef(tutorialCompleted);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const step = TUTORIAL_STEPS[stepIndex];
  const copy = step?.[language] ?? step?.de;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (wasCompleted.current && !tutorialCompleted) setStepIndex(0);
    wasCompleted.current = tutorialCompleted;
  }, [tutorialCompleted]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") completeTutorial();
      if (event.key === "ArrowRight" && !isLast) setStepIndex((value) => value + 1);
      if (event.key === "ArrowLeft" && !isFirst) setStepIndex((value) => value - 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completeTutorial, isFirst, isLast]);

  useEffect(() => {
    if (tutorialCompleted || !step) return;
    setSpotlight(null);
    setTargetReady(!step.target);
    navigate(step.route, { replace: true });
  }, [navigate, step, tutorialCompleted]);

  useLayoutEffect(() => {
    if (tutorialCompleted || !step?.target) return;

    let frame = 0;
    let attempts = 0;
    let observer: ResizeObserver | undefined;
    let updateTarget: (() => void) | undefined;
    let settleTimer: number | undefined;

    const locateTarget = () => {
      const element = document.querySelector(step.target!);
      if (!element) {
        attempts += 1;
        if (attempts < 90) frame = window.requestAnimationFrame(locateTarget);
        return;
      }

      element.scrollIntoView({ behavior: "smooth", block: "center" });
      updateTarget = () => setSpotlight(getSpotlightRect(element));
      settleTimer = window.setTimeout(() => {
        updateTarget?.();
        setTargetReady(true);
      }, 280);
      observer = new ResizeObserver(updateTarget);
      observer.observe(element);
      window.addEventListener("resize", updateTarget);
      window.addEventListener("scroll", updateTarget, true);
    };

    frame = window.requestAnimationFrame(locateTarget);
    return () => {
      window.cancelAnimationFrame(frame);
      if (settleTimer) window.clearTimeout(settleTimer);
      observer?.disconnect();
      if (updateTarget) {
        window.removeEventListener("resize", updateTarget);
        window.removeEventListener("scroll", updateTarget, true);
      }
    };
  }, [step, tutorialCompleted]);

  useEffect(() => {
    if (targetReady) tooltipRef.current?.focus();
  }, [stepIndex, targetReady]);

  if (tutorialCompleted || !step || !copy) return null;

  const Icon = step.icon;
  const hasSpotlight = Boolean(step.target && spotlight);
  const compact = window.innerWidth < 640;
  const tooltipStyle = hasSpotlight && spotlight
    ? compact
      ? { left: VIEWPORT_GAP, right: VIEWPORT_GAP, bottom: 92 }
      : {
          left: Math.min(
            window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_GAP,
            Math.max(VIEWPORT_GAP, spotlight.left + spotlight.width / 2 - TOOLTIP_WIDTH / 2)
          ),
          top: spotlight.top + spotlight.height + 16 + 360 < window.innerHeight
            ? spotlight.top + spotlight.height + 16
            : Math.max(VIEWPORT_GAP, spotlight.top - 376),
          width: TOOLTIP_WIDTH
        }
    : undefined;

  const goForward = () => {
    if (isLast) {
      completeTutorial();
      navigate(TUTORIAL_STEPS.find((entry) => entry.id === "exams")?.route ?? TUTORIAL_STEPS[1].route, { replace: true });
      return;
    }
    setStepIndex((value) => value + 1);
  };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      {hasSpotlight && spotlight ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-slate-950/72 backdrop-blur-[1px]" style={{ height: spotlight.top }} />
          <div className="absolute left-0 bg-slate-950/72 backdrop-blur-[1px]" style={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }} />
          <div className="absolute right-0 bg-slate-950/72 backdrop-blur-[1px]" style={{ top: spotlight.top, left: spotlight.left + spotlight.width, height: spotlight.height }} />
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/72 backdrop-blur-[1px]" style={{ top: spotlight.top + spotlight.height }} />
          <div
            className="pointer-events-none absolute rounded-[28px] border-2 border-teal-300 shadow-[0_0_0_4px_rgba(45,212,191,0.2),0_0_30px_rgba(45,212,191,0.35)] transition-all duration-300"
            style={spotlight}
            aria-hidden="true"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      )}

      <div
        ref={tooltipRef}
        tabIndex={-1}
        style={tooltipStyle}
        className={`absolute max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[28px] border border-white/20 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900 ${hasSpotlight ? "" : "left-1/2 top-1/2 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-300 text-slate-950">
              <Icon size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
                {language === "en" ? `Step ${stepIndex + 1} of ${TUTORIAL_STEPS.length}` : `Schritt ${stepIndex + 1} von ${TUTORIAL_STEPS.length}`}
              </p>
              <div className="mt-1 flex gap-1" aria-hidden="true">
                {TUTORIAL_STEPS.map((entry, index) => (
                  <span key={entry.id} className={`h-1 rounded-full transition-all ${index === stepIndex ? "w-6 bg-teal-500" : index < stepIndex ? "w-2 bg-teal-300" : "w-2 bg-slate-200 dark:bg-slate-700"}`} />
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={completeTutorial} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label={language === "en" ? "Close tutorial" : "Einführung schließen"}>
            <X size={18} />
          </button>
        </div>

        <h2 id="tutorial-title" className="mt-4 font-display text-2xl text-slate-950 dark:text-white">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.summary}</p>

        <div className="mt-4 rounded-2xl bg-teal-50 p-3.5 dark:bg-teal-500/10">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-800 dark:text-teal-300">
            <MousePointer2 size={15} aria-hidden="true" />
            {language === "en" ? "What to do" : "Was du hier machst"}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-800 dark:text-slate-100">{copy.action}</p>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          <Lightbulb className="mt-0.5 shrink-0 text-orange-500" size={15} aria-hidden="true" />
          <span>{copy.why}</span>
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" disabled={isFirst} onClick={() => setStepIndex((value) => value - 1)} className="inline-flex items-center gap-1 rounded-full px-3 py-2.5 text-sm font-semibold text-slate-600 disabled:invisible dark:text-slate-300">
            <ChevronLeft size={16} />
            {language === "en" ? "Back" : "Zurück"}
          </button>
          <button type="button" onClick={goForward} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg dark:bg-teal-500 dark:text-slate-950">
            {isLast ? (language === "en" ? "Finish" : "Fertig") : isFirst ? (language === "en" ? "Start tour" : "Tour starten") : (language === "en" ? "Next" : "Weiter")}
            {!isLast ? <ChevronRight size={16} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
