export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDate(dateString: string, includeYear = true): string {
  return new Date(dateString).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {})
  });
}

export function formatDateTime(dateString: string, time: string): string {
  return `${formatDate(dateString)} um ${time} Uhr`;
}

export function daysUntil(dateString: string): number {
  return Math.max(0, Math.ceil((startOfDay(new Date(dateString)).getTime() - startOfDay(new Date()).getTime()) / 86400000));
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function getMonthGrid(baseDate: Date): Date[] {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const offset = (start.getDay() + 6) % 7;
  const firstCell = addDays(start, -offset);
  const totalDays = Math.ceil((offset + end.getDate()) / 7) * 7;
  return Array.from({ length: totalDays }, (_, index) => addDays(firstCell, index));
}

export function getWeekRange(baseDate: Date): Date[] {
  const mondayOffset = (baseDate.getDay() + 6) % 7;
  const monday = addDays(baseDate, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function humanWeekday(date: Date): string {
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}
