import { SPACED_REPETITION_INTERVALS } from "../lib/constants";
import type { Exam, StudyTask, Topic } from "../types";
import { addDays, startOfDay, toIsoDate } from "../utils/dateUtils";

export interface AdaptivePlanInsight {
  examId: string;
  topicId: string;
  topicName: string;
  score: number;
  missedCount: number;
  overdueCount: number;
  doneCount: number;
  reason: string;
}

export function calculatePriority(difficulty: number, knowledgeLevel: number): number {
  return difficulty * 2 + (6 - knowledgeLevel);
}

export function generateStudyPlanForExam(exam: Exam, topics: Topic[], baseDate = new Date()): StudyTask[] {
  const sortedTopics = [...topics].sort((a, b) => b.difficulty - a.difficulty);
  const topicPool = sortedTopics.length
    ? sortedTopics
    : [
        { id: `${exam.id}-fallback-1`, name: "Grundlagen festigen", difficulty: 3, estimatedMinutes: 30 },
        { id: `${exam.id}-fallback-2`, name: "Übungsaufgaben lösen", difficulty: 4, estimatedMinutes: 40 },
        { id: `${exam.id}-fallback-3`, name: "Probeklausur schreiben", difficulty: 5, estimatedMinutes: 50 }
      ];

  const today = startOfDay(baseDate);
  const examDate = startOfDay(new Date(exam.date));
  const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - today.getTime()) / 86400000));
  const priority = calculatePriority(exam.difficulty, exam.knowledgeLevel);
  const slots = Math.max(topicPool.length, daysUntilExam - 1);
  const learnSlots = Math.max(1, Math.round(slots * 0.7));
  const reviewSlots = Math.max(1, Math.round(slots * 0.2));
  const bufferSlots = Math.max(1, slots - learnSlots - reviewSlots);
  const intervals = SPACED_REPETITION_INTERVALS.filter((value) => value < daysUntilExam);

  return Array.from({ length: slots }, (_, index): StudyTask => {
    const slotDate = addDays(today, index);
    const topic = topicPool[index % topicPool.length];
    let type: StudyTask["type"] = "learn";

    if (index >= learnSlots && index < learnSlots + reviewSlots) type = "review";
    if (index >= learnSlots + reviewSlots || intervals.includes(index + 1)) type = "buffer";
    if (intervals.includes(index + 1)) type = "review";

    return {
      id: `${exam.id}-task-${index + 1}-${topic.id}`,
      examId: exam.id,
      topicId: topic.id,
      date: toIsoDate(slotDate),
      task: buildTaskLabel(topic.name, type),
      duration: Math.max(20, Math.round(((exam.dailyMinutes || topic.estimatedMinutes || 35) * Math.min(priority, 12)) / 10)),
      type,
      status: "open",
      userId: exam.userId,
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };
  }).slice(0, slots - bufferSlots + reviewSlots + bufferSlots);
}

export function redistributeMissedStudyTasks(tasks: StudyTask[], examLookup: Map<string, Exam>, baseDate = new Date()): StudyTask[] {
  const today = toIsoDate(baseDate);
  const movedDates = new Map<string, number>();

  return tasks.map((task) => {
    if (task.status === "done" || task.date >= today || task.deletedAt) return task;

    const exam = examLookup.get(task.examId);
    if (!exam) return { ...task, status: "missed", updatedAt: new Date().toISOString() };

    const key = task.examId;
    const currentOffset = movedDates.get(key) ?? 1;
    const nextDate = addDays(baseDate, currentOffset);
    const examDate = new Date(exam.date);
    movedDates.set(key, currentOffset + 1);

    if (nextDate >= examDate) {
      return { ...task, status: "missed", updatedAt: new Date().toISOString() };
    }

    return {
      ...task,
      date: toIsoDate(nextDate),
      status: "open",
      updatedAt: new Date().toISOString()
    };
  });
}

export function generateAdaptiveStudyPlanForExam(
  exam: Exam,
  topics: Topic[],
  existingTasks: StudyTask[],
  baseDate = new Date()
): { tasks: StudyTask[]; insights: AdaptivePlanInsight[] } {
  const today = startOfDay(baseDate);
  const examDate = startOfDay(new Date(exam.date));
  const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - today.getTime()) / 86400000));
  const activeTopics = topics.filter((topic) => !topic.deletedAt);
  const topicPool = activeTopics.length
    ? activeTopics
    : [
        { id: `${exam.id}-fallback-1`, examId: exam.id, name: "Grundlagen festigen", completed: false, difficulty: 3, estimatedMinutes: 30, updatedAt: new Date().toISOString(), deletedAt: null },
        { id: `${exam.id}-fallback-2`, examId: exam.id, name: "Uebungsaufgaben loesen", completed: false, difficulty: 4, estimatedMinutes: 40, updatedAt: new Date().toISOString(), deletedAt: null },
        { id: `${exam.id}-fallback-3`, examId: exam.id, name: "Probeklausur schreiben", completed: false, difficulty: 5, estimatedMinutes: 50, updatedAt: new Date().toISOString(), deletedAt: null }
      ];
  const examTasks = existingTasks.filter((task) => task.examId === exam.id && !task.deletedAt);
  const insights = buildAdaptiveInsightsForExam(exam, topicPool, examTasks, baseDate);
  const orderedTopics = insights
    .map((insight) => topicPool.find((topic) => topic.id === insight.topicId))
    .filter((topic): topic is Topic => Boolean(topic));
  const slots = Math.max(topicPool.length, daysUntilExam - 1);
  const planStamp = Math.floor(baseDate.getTime() / 1000).toString(36);
  const intervals = SPACED_REPETITION_INTERVALS.filter((value) => value < daysUntilExam);

  const tasks = Array.from({ length: slots }, (_, index): StudyTask => {
    const topic = pickWeightedTopic(orderedTopics, insights, index);
    const insight = insights.find((entry) => entry.topicId === topic.id);
    const slotDate = addDays(today, index);
    const type = resolveAdaptiveTaskType(index, insight, topic, intervals);

    return {
      id: `${exam.id}-adaptive-${planStamp}-${index + 1}-${topic.id}`,
      examId: exam.id,
      topicId: topic.id,
      date: toIsoDate(slotDate),
      task: buildAdaptiveTaskLabel(topic.name, type, insight),
      duration: calculateAdaptiveDuration(exam, topic, insight),
      type,
      status: "open",
      userId: exam.userId,
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };
  });

  return { tasks, insights };
}

export function buildAdaptivePlanInsights(
  exams: Exam[],
  topics: Topic[],
  tasks: StudyTask[],
  baseDate = new Date()
): AdaptivePlanInsight[] {
  return exams
    .filter((exam) => !exam.deletedAt)
    .flatMap((exam) =>
      buildAdaptiveInsightsForExam(
        exam,
        topics.filter((topic) => topic.examId === exam.id && !topic.deletedAt),
        tasks.filter((task) => task.examId === exam.id && !task.deletedAt),
        baseDate
      )
    )
    .sort((left, right) => right.score - left.score);
}

function buildTaskLabel(topicName: string, type: StudyTask["type"]): string {
  if (type === "review") return `${topicName} wiederholen`;
  if (type === "buffer") return `${topicName} absichern`;
  return `${topicName} lernen`;
}

function buildAdaptiveInsightsForExam(
  exam: Exam,
  topics: Array<Topic | { id: string; examId?: string; name: string; completed?: boolean; difficulty: number; estimatedMinutes: number; updatedAt?: string; deletedAt?: string | null }>,
  tasks: StudyTask[],
  baseDate: Date
): AdaptivePlanInsight[] {
  const today = toIsoDate(baseDate);
  const examDate = startOfDay(new Date(exam.date));
  const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - startOfDay(baseDate).getTime()) / 86400000));
  const urgencyBonus = daysUntilExam <= 3 ? 5 : daysUntilExam <= 7 ? 3 : daysUntilExam <= 14 ? 1 : 0;

  return topics
    .map((topic) => {
      const topicTasks = tasks.filter((task) => task.topicId === topic.id);
      const missedCount = topicTasks.filter((task) => task.status === "missed").length;
      const overdueCount = topicTasks.filter((task) => task.status === "open" && task.date < today).length;
      const doneCount = topicTasks.filter((task) => task.status === "done").length;
      const untouchedBonus = topicTasks.length === 0 ? 2 : 0;
      const completedPenalty = topic.completed ? 3 : 0;
      const score = Math.max(
        1,
        topic.difficulty * 2 +
          (6 - exam.knowledgeLevel) +
          missedCount * 3 +
          overdueCount * 2 +
          untouchedBonus +
          urgencyBonus -
          doneCount -
          completedPenalty
      );

      return {
        examId: exam.id,
        topicId: topic.id,
        topicName: topic.name,
        score,
        missedCount,
        overdueCount,
        doneCount,
        reason: buildAdaptiveReason(topic.name, missedCount, overdueCount, doneCount, topic.completed ?? false, daysUntilExam)
      };
    })
    .sort((left, right) => right.score - left.score || left.topicName.localeCompare(right.topicName));
}

function pickWeightedTopic(topics: Topic[], insights: AdaptivePlanInsight[], index: number): Topic {
  const fallback = topics[index % Math.max(1, topics.length)];
  if (!fallback) throw new Error("Adaptive plan requires at least one topic");

  const weighted = topics.flatMap((topic) => {
    const score = insights.find((insight) => insight.topicId === topic.id)?.score ?? 1;
    const weight = score >= 15 ? 3 : score >= 10 ? 2 : 1;
    return Array.from({ length: weight }, () => topic);
  });

  return weighted[index % weighted.length] ?? fallback;
}

function resolveAdaptiveTaskType(
  index: number,
  insight: AdaptivePlanInsight | undefined,
  topic: Topic,
  intervals: number[]
): StudyTask["type"] {
  if (intervals.includes(index + 1)) return "review";
  if (insight && (insight.missedCount > 0 || insight.doneCount > 1 || topic.completed)) return "review";
  if (index > 0 && (index + 1) % 5 === 0) return "buffer";
  return "learn";
}

function calculateAdaptiveDuration(exam: Exam, topic: Topic, insight: AdaptivePlanInsight | undefined): number {
  const baseMinutes = exam.dailyMinutes || topic.estimatedMinutes || 35;
  const pressure = Math.min(1.35, 1 + ((insight?.score ?? topic.difficulty * 2) - 8) / 50);
  return Math.max(20, Math.round(baseMinutes * pressure));
}

function buildAdaptiveTaskLabel(topicName: string, type: StudyTask["type"], insight: AdaptivePlanInsight | undefined): string {
  if (type === "buffer") return `${topicName} absichern`;
  if (type === "review") return `${topicName} gezielt wiederholen`;
  if (insight && (insight.missedCount > 0 || insight.overdueCount > 0)) return `${topicName} nacharbeiten`;
  return `${topicName} lernen`;
}

function buildAdaptiveReason(
  topicName: string,
  missedCount: number,
  overdueCount: number,
  doneCount: number,
  completed: boolean,
  daysUntilExam: number
): string {
  if (missedCount > 0) return `${topicName}: ${missedCount} verpasste Aufgabe(n) priorisiert.`;
  if (overdueCount > 0) return `${topicName}: ${overdueCount} offene Aufgabe(n) sind ueberfaellig.`;
  if (!completed && doneCount === 0) return `${topicName}: noch kein abgeschlossener Nachweis.`;
  if (daysUntilExam <= 7) return `${topicName}: Klausurtermin ist nah.`;
  return `${topicName}: Wiederholung nach Lernverlauf eingeplant.`;
}
