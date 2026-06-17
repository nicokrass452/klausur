import type { Exam, StudyTask, Topic } from "../types";

export function getExamProgress(examId: string, topics: Topic[]): number {
  const examTopics = topics.filter((topic) => topic.examId === examId);
  if (!examTopics.length) return 0;
  return Math.round((examTopics.filter((topic) => topic.completed).length / examTopics.length) * 100);
}

export function getWeakestExam(exams: Exam[], topics: Topic[]): Exam | undefined {
  return [...exams].sort((a, b) => getExamProgress(a.id, topics) - getExamProgress(b.id, topics))[0];
}

export function getLearningMinutesForExam(examId: string, tasks: StudyTask[]): number {
  return tasks
    .filter((task) => task.examId === examId && task.status === "done")
    .reduce((sum, task) => sum + task.duration, 0);
}
