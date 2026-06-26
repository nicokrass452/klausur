import type { Exam } from "../types";

function toIcalDateTime(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, hours ?? 0, minutes ?? 0));
  return value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function generateUid(exam: Exam): string {
  return `${exam.id}@klausurplaner.local`;
}

export function examsToIcal(exams: Exam[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Klausurplaner//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  for (const exam of exams) {
    const dtStart = toIcalDateTime(exam.date, exam.time || "08:00");
    const dtStamp = toIcalDateTime(new Date().toISOString().slice(0, 10), new Date().toTimeString().slice(0, 5));

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${generateUid(exam)}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`SUMMARY:${escapeIcalText(exam.subject)}`);
    if (exam.room) {
      lines.push(`LOCATION:${escapeIcalText(exam.room)}`);
    }
    if (exam.notes) {
      lines.push(`DESCRIPTION:${escapeIcalText(exam.notes)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  // Fold lines longer than 75 octets (simple folding with CRLF + space)
  const folded: string[] = [];
  for (const line of lines) {
    if (line.length <= 75) {
      folded.push(line);
      continue;
    }
    let remaining = line;
    let first = true;
    while (remaining.length > 0) {
      const limit = first ? 75 : 74;
      const chunk = remaining.slice(0, limit);
      folded.push(first ? chunk : " " + chunk);
      remaining = remaining.slice(limit);
      first = false;
    }
  }

  return folded.join("\r\n") + "\r\n";
}

export function downloadIcalFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
