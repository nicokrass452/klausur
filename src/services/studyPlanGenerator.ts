import { SPACED_REPETITION_INTERVALS } from "../lib/constants";
import type { Exam, StudyTask, Topic } from "../types";
import { addDays, startOfDay, toIsoDate } from "../utils/dateUtils";

export function calculatePriority(difficulty: number, knowledgeLevel: number): number {
  return difficulty * 2 + (6 - knowledgeLevel);
}

export function generateStudyPlanForExam(exam: Exam, topics: Topic[], baseDate = new Date()): StudyTask[] {
  const sortedTopics = [...topics].sort((a, b) => b.difficulty - a.difficulty);
  const topicPool = sortedTopics.length
    ? sortedTopics
    : [
        { id: `${exam.id}-fallback-1`, name: "Grundlagen festigen", difficulty: 3, estimatedMinutes: 30 },
        { id: `${exam.id}-fallback-2`, name: "Uebungsaufgaben loesen", difficulty: 4, estimatedMinutes: 40 },
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

function buildTaskLabel(topicName: string, type: StudyTask["type"]): string {
  if (type === "review") return `${topicName} wiederholen`;
  if (type === "buffer") return `${topicName} absichern`;
  return `${topicName} lernen`;
}
