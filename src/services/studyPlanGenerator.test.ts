import { describe, it, expect } from "vitest";
import { calculatePriority, generateStudyPlanForExam } from "./studyPlanGenerator";
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
});
