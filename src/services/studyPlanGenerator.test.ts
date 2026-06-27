import { describe, it, expect } from "vitest";
import { buildAdaptivePlanInsights, calculatePriority, generateAdaptiveStudyPlanForExam, generateStudyPlanForExam } from "./studyPlanGenerator";
import type { Exam, Topic } from "../types";
import { toIsoDate, addDays, startOfDay } from "../utils/dateUtils";

describe("studyPlanGenerator", () => {
  describe("calculatePriority", () => {
    it("should calculate correct priority based on difficulty and knowledgeLevel", () => {
      // Formel: difficulty * 2 + (6 - knowledgeLevel)
      expect(calculatePriority(3, 3)).toBe(3 * 2 + (6 - 3)); // 9
      expect(calculatePriority(5, 1)).toBe(5 * 2 + (6 - 1)); // 15
      expect(calculatePriority(1, 5)).toBe(1 * 2 + (6 - 5)); // 3
    });
  });

  describe("generateStudyPlanForExam", () => {
    it("should generate a valid study plan based on given dates and topics", () => {
      const baseDate = new Date("2024-01-01T10:00:00Z"); // StartDate
      const examDate = new Date("2024-01-05T10:00:00Z"); // 4 days later

      const exam = {
createdAt: new Date().toISOString(),
        id: "exam-1",
        userId: "user-1",
        subject: "Math",
        date: toIsoDate(examDate),
        time: "10:00",
        room: "A1",
        notes: "",
        difficulty: 3,
        knowledgeLevel: 3,
        color: "#ff0000",
        dailyMinutes: 30,
                updatedAt: new Date().toISOString(),
        deletedAt: null
      };

      const topics: Topic[] = [
        {
          id: "topic-1",
          userId: "user-1",
          examId: "exam-1",
          name: "Algebra",
          completed: false,
          difficulty: 3,
          estimatedMinutes: 30,
                    updatedAt: new Date().toISOString(),
          deletedAt: null
        },
        {
          id: "topic-2",
          userId: "user-1",
          examId: "exam-1",
          name: "Geometry",
          completed: false,
          difficulty: 4,
          estimatedMinutes: 40,
                    updatedAt: new Date().toISOString(),
          deletedAt: null
        }
      ];

      const tasks = generateStudyPlanForExam(exam, topics, baseDate);

      expect(tasks.length).toBeGreaterThan(0);

      const daysUntilExam = Math.max(1, Math.ceil((startOfDay(examDate).getTime() - startOfDay(baseDate).getTime()) / 86400000));
      // slots = Math.max(topics.length, daysUntilExam - 1) = max(2, 4 - 1) = 3
      expect(tasks.length).toBe(3);

      // The first task might be "review" or "buffer" due to SPACED_REPETITION_INTERVALS (which is [1, 2, ...])
      // since index + 1 = 1 is in intervals. So it becomes "buffer" or "review".
      // We just expect valid task types.
      expect(["learn", "review", "buffer"]).toContain((tasks[0] || {}).type);
      // task 1 has the highest priority topic because they are sorted by difficulty desc
      expect(tasks[0]?.topicId).toBe("topic-2");

      expect(tasks.some(task => task.examId === "exam-1")).toBeTruthy();
    });

    it("should use fallback topics if no topics are provided", () => {
      const baseDate = new Date("2024-01-01T10:00:00Z");
      const examDate = new Date("2024-01-05T10:00:00Z");

      const exam = {
createdAt: new Date().toISOString(),
        id: "exam-2",
        userId: "user-1",
        subject: "English",
        date: toIsoDate(examDate),
        time: "10:00",
        room: "",
        notes: "",
        difficulty: 2,
        knowledgeLevel: 4,
        color: "#0000ff",
        dailyMinutes: 20,
                updatedAt: new Date().toISOString(),
        deletedAt: null
      };

      const tasks = generateStudyPlanForExam(exam, [], baseDate);
      expect(tasks.length).toBeGreaterThan(0);
      expect(tasks[0]?.topicId?.includes("fallback")).toBe(true);
    });
  });

  describe("generateAdaptiveStudyPlanForExam", () => {
    it("prioritizes missed and overdue weak topics", () => {
      const baseDate = new Date("2024-01-01T10:00:00Z");
      const examDate = new Date("2024-01-08T10:00:00Z");
      const exam: Exam = {
        createdAt: new Date().toISOString(),
        id: "exam-adaptive",
        userId: "user-1",
        subject: "Math",
        date: toIsoDate(examDate),
        time: "10:00",
        room: "A1",
        notes: "",
        difficulty: 4,
        knowledgeLevel: 2,
        color: "#ff0000",
        dailyMinutes: 30,
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      const topics: Topic[] = [
        { id: "topic-weak", userId: "user-1", examId: exam.id, name: "Integrals", completed: false, difficulty: 5, estimatedMinutes: 40, updatedAt: new Date().toISOString(), deletedAt: null },
        { id: "topic-strong", userId: "user-1", examId: exam.id, name: "Basics", completed: true, difficulty: 2, estimatedMinutes: 20, updatedAt: new Date().toISOString(), deletedAt: null }
      ];
      const existingTasks = [
        { id: "missed", examId: exam.id, topicId: "topic-weak", date: "2023-12-31", task: "old", duration: 30, type: "learn" as const, status: "missed" as const, updatedAt: new Date().toISOString(), deletedAt: null },
        { id: "overdue", examId: exam.id, topicId: "topic-weak", date: "2023-12-30", task: "old", duration: 30, type: "learn" as const, status: "open" as const, updatedAt: new Date().toISOString(), deletedAt: null },
        { id: "done", examId: exam.id, topicId: "topic-strong", date: "2023-12-30", task: "old", duration: 30, type: "review" as const, status: "done" as const, updatedAt: new Date().toISOString(), deletedAt: null }
      ];

      const result = generateAdaptiveStudyPlanForExam(exam, topics, existingTasks, baseDate);

      expect(result.insights[0]?.topicId).toBe("topic-weak");
      expect(result.tasks[0]?.topicId).toBe("topic-weak");
      expect(result.tasks.some((task) => task.task.includes("nacharbeiten") || task.task.includes("wiederholen"))).toBe(true);
    });
  });

  describe("buildAdaptivePlanInsights", () => {
    it("returns cross-exam insights sorted by score", () => {
      const baseDate = new Date("2024-01-01T10:00:00Z");
      const exams: Exam[] = [
        { id: "exam-a", userId: "user-1", subject: "A", date: "2024-01-03", time: "", room: "", notes: "", difficulty: 5, knowledgeLevel: 1, color: "#000", createdAt: "", dailyMinutes: 30, updatedAt: "", deletedAt: null },
        { id: "exam-b", userId: "user-1", subject: "B", date: "2024-02-03", time: "", room: "", notes: "", difficulty: 1, knowledgeLevel: 5, color: "#000", createdAt: "", dailyMinutes: 30, updatedAt: "", deletedAt: null }
      ];
      const topics: Topic[] = [
        { id: "topic-a", userId: "user-1", examId: "exam-a", name: "A weak", completed: false, difficulty: 5, estimatedMinutes: 30, updatedAt: "", deletedAt: null },
        { id: "topic-b", userId: "user-1", examId: "exam-b", name: "B ok", completed: true, difficulty: 1, estimatedMinutes: 30, updatedAt: "", deletedAt: null }
      ];

      const insights = buildAdaptivePlanInsights(exams, topics, [], baseDate);

      expect(insights[0]?.topicId).toBe("topic-a");
      expect(insights[0]?.score).toBeGreaterThan(insights[1]?.score ?? 0);
    });
  });
});
