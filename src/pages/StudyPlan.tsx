import { Copy, Plus, Share2, Trash2, Users, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskCard } from "../components/TaskCard";
import { t } from "../lib/i18n";
import { generateFlashcardsFromTopicsResult, generateQuizFromTopicsResult, hasSupabaseEnv, optimizeStudyPlanWithAiResult } from "../services/aiService";
import { buildAdaptivePlanInsights } from "../services/studyPlanGenerator";
import { useAppStore } from "../store/useAppStore";
import type { Exam, LearningGroup, StudyTask } from "../types";

function aiSourceName(source: "glm" | "deepseek" | "mock"): string {
  if (source === "glm") return "GLM";
  if (source === "deepseek") return "DeepSeek";
  return "Mock";
}

function buildGroupShareText(group: LearningGroup, exams: Exam[], tasks: StudyTask[]): string {
  const sharedExams = exams.filter((exam) => group.examIds.includes(exam.id));
  const lines = [
    `Lerngruppe: ${group.name}`,
    `Code: ${group.inviteCode}`,
    `Mitglieder: ${group.memberNames.join(", ") || "-"}`,
    "Geteilte Klausuren:"
  ];

  sharedExams.forEach((exam) => {
    const openTasks = tasks.filter((task) => task.examId === exam.id && task.status === "open").length;
    const doneTasks = tasks.filter((task) => task.examId === exam.id && task.status === "done").length;
    lines.push(`- ${exam.subject} am ${exam.date}: ${doneTasks} erledigt, ${openTasks} offen`);
  });

  return lines.join("\n");
}

export function StudyPlanPage() {
  const allExams = useAppStore((state) => state.exams);
  const allStudyTasks = useAppStore((state) => state.studyTasks);
  const allTopics = useAppStore((state) => state.topics);
  const allLearningGroups = useAppStore((state) => state.learningGroups);
  const setTaskStatus = useAppStore((state) => state.setTaskStatus);
  const redistributeMissed = useAppStore((state) => state.redistributeMissed);
  const regenerateAdaptiveStudyPlan = useAppStore((state) => state.regenerateAdaptiveStudyPlan);
  const createLearningGroup = useAppStore((state) => state.createLearningGroup);
  const shareExamWithGroup = useAppStore((state) => state.shareExamWithGroup);
  const unshareExamFromGroup = useAppStore((state) => state.unshareExamFromGroup);
  const removeLearningGroup = useAppStore((state) => state.removeLearningGroup);
  const isOfflineReadOnly = useAppStore((state) => state.authMode === "offline-readonly");
  const language = useAppStore((state) => state.settings.language);
  const [aiSummary, setAiSummary] = useState(hasSupabaseEnv ? t("studyPlan.aiReady", language) : t("common.mockFallback", language));
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | undefined>();
  const [aiRateLimited, setAiRateLimited] = useState(false);
  const [groupName, setGroupName] = useState("Lerngruppe");
  const [memberName, setMemberName] = useState("");
  const [copiedGroupId, setCopiedGroupId] = useState<string | undefined>();

  const exams = useMemo(() => allExams.filter((entry) => !entry.deletedAt), [allExams]);
  const studyTasks = useMemo(() => allStudyTasks.filter((entry) => !entry.deletedAt), [allStudyTasks]);
  const topics = useMemo(() => allTopics.filter((entry) => !entry.deletedAt), [allTopics]);
  const learningGroups = useMemo(() => allLearningGroups.filter((entry) => !entry.deletedAt), [allLearningGroups]);
  const sortedTasks = useMemo(() => [...studyTasks].sort((a, b) => a.date.localeCompare(b.date)), [studyTasks]);
  const adaptiveInsights = useMemo(() => buildAdaptivePlanInsights(exams, topics, studyTasks).slice(0, 3), [exams, topics, studyTasks]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t("studyPlan.title", language)}</p>
            <h3 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">{t("studyPlan.subtitle", language)}</h3>
          </div>
          <button disabled={isOfflineReadOnly} onClick={redistributeMissed} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
            {t("studyPlan.redistributeMissed", language)}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => regenerateAdaptiveStudyPlan()}
            disabled={isOfflineReadOnly || exams.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 disabled:opacity-50 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
          >
            <WandSparkles size={16} aria-hidden="true" />
            Adaptiv neu planen
          </button>
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiError(undefined);
              try {
                const result = await optimizeStudyPlanWithAiResult(sortedTasks);
                setAiError(result.error);
                setAiRateLimited(result.rateLimited ?? false);
                setAiSummary(`${aiSourceName(result.source)} priorisiert ${result.data.slice(0, 3).map((task) => task.task).join(", ")}.`);
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white dark:bg-teal-500 dark:text-slate-950"
          >
            <WandSparkles size={16} aria-hidden="true" />
            {aiLoading ? t("common.aiLoading", language) : t("studyPlan.optimizeAi", language)}
          </button>
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiError(undefined);
              try {
                const result = await generateQuizFromTopicsResult(topics);
                setAiError(result.error);
                setAiRateLimited(result.rateLimited ?? false);
                setAiSummary(`${aiSourceName(result.source)} hat ${result.data.length} Fragen aus deinen Themen erzeugt.`);
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {t("studyPlan.generateQuiz", language)}
          </button>
          <button
            onClick={async () => {
              setAiLoading(true);
              setAiError(undefined);
              try {
                const result = await generateFlashcardsFromTopicsResult(topics);
                setAiError(result.error);
                setAiRateLimited(result.rateLimited ?? false);
                setAiSummary(`${aiSourceName(result.source)} hat ${result.data.length} Karten vorbereitet.`);
              } finally {
                setAiLoading(false);
              }
            }}
            disabled={aiLoading}
            className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
          >
            {t("studyPlan.generateFlashcards", language)}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-500" aria-live="polite">{aiSummary}</p>
        {aiRateLimited ? (
          <p className="mt-2 text-sm font-semibold text-rose-600 dark:text-rose-300" role="status" aria-live="polite">
            {t("common.rateLimitedWait", language)}
          </p>
        ) : null}
        {aiError ? <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">{aiError}</p> : null}

        {adaptiveInsights.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {adaptiveInsights.map((insight) => (
              <article key={`${insight.examId}-${insight.topicId}`} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Score {insight.score}</p>
                <h4 className="mt-2 font-display text-lg text-slate-950 dark:text-white">{insight.topicName}</h4>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{insight.reason}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-[32px] border border-white/50 bg-white/80 p-6 shadow-panel dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Lerngruppen</p>
            <h3 className="mt-2 font-display text-2xl text-slate-950 dark:text-white">Geteilte Plaene</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              aria-label="Name der Lerngruppe"
            />
            <input
              value={memberName}
              onChange={(event) => setMemberName(event.target.value)}
              className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              aria-label="Mitglied"
              placeholder="Mitglied"
            />
            <button
              type="button"
              disabled={isOfflineReadOnly}
              onClick={() => {
                createLearningGroup({ name: groupName, memberNames: memberName ? [memberName] : [], examIds: exams[0] ? [exams[0].id] : [] });
                setMemberName("");
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950"
            >
              <Plus size={16} aria-hidden="true" />
              Gruppe
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {learningGroups.map((group) => (
            <article key={group.id} className="rounded-[24px] border border-slate-200/80 bg-white/75 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users size={16} aria-hidden="true" />
                    <span className="text-sm font-semibold">{group.inviteCode}</span>
                  </div>
                  <h4 className="mt-2 font-display text-xl text-slate-950 dark:text-white">{group.name}</h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{group.memberNames.join(" / ") || "Keine Mitglieder"}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(buildGroupShareText(group, exams, studyTasks));
                      setCopiedGroupId(group.id);
                    }}
                    className="inline-flex size-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-200"
                    aria-label="Gruppenplan kopieren"
                    title="Gruppenplan kopieren"
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={isOfflineReadOnly}
                    onClick={() => removeLearningGroup(group.id)}
                    className="inline-flex size-10 items-center justify-center rounded-2xl border border-rose-200 text-rose-600 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300"
                    aria-label="Lerngruppe entfernen"
                    title="Lerngruppe entfernen"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {exams.map((exam) => {
                  const shared = group.examIds.includes(exam.id);
                  return (
                    <button
                      key={exam.id}
                      type="button"
                      disabled={isOfflineReadOnly}
                      aria-pressed={shared}
                      onClick={() => (shared ? unshareExamFromGroup(group.id, exam.id) : shareExamWithGroup(group.id, exam.id))}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                        shared
                          ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
                          : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <Share2 size={14} aria-hidden="true" />
                      {exam.subject}
                    </button>
                  );
                })}
              </div>
              {copiedGroupId === group.id ? (
                <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300" role="status" aria-live="polite">Plan kopiert.</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {sortedTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            exam={exams.find((exam) => exam.id === task.examId)}
            onComplete={() => setTaskStatus(task.id, task.status === "done" ? "open" : "done")}
            onMissed={() => setTaskStatus(task.id, "missed")}
            disabled={isOfflineReadOnly}
          />
        ))}
      </section>
    </div>
  );
}
