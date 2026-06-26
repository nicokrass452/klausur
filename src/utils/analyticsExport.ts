import type { Exam, StudyTask, UserStats } from "../types";
import { getLearningMinutesForExam } from "./examUtils";

export interface AnalyticsExportRow {
  date: string;
  xp: number;
  totalStudyMinutes: number;
}

export function buildAnalyticsCsv(
  stats: UserStats,
  exams: Exam[],
  tasks: StudyTask[]
): string {
  const rows: string[] = [];
  rows.push("Fach,Lernminuten,Gesamt-Xp,Xp-verlauf-Datum,Xp-verlauf-Wert");

  for (const exam of exams) {
    const minutes = getLearningMinutesForExam(exam.id, tasks);
    const history = stats.xpHistory.map((entry) => `${entry.date}:${entry.xp}`).join(";");
    rows.push(`"${exam.subject}",${minutes},${stats.xp},"${history}"`);
  }

  if (exams.length === 0) {
    rows.push(`"-",0,${stats.xp},"-"`);
  }

  return rows.join("\n") + "\n";
}

export function downloadCsvFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function xpTrendSummary(stats: UserStats, days: number): { totalXp: number; average: number } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const entries = stats.xpHistory.filter((entry) => entry.date >= cutoffIso);
  const totalXp = entries.reduce((sum, entry) => sum + entry.xp, 0);
  return { totalXp, average: entries.length ? Math.round(totalXp / entries.length) : 0 };
}
