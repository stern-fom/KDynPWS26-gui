export type CalendarEvent = {
  uuid: string;
  title: string;
  description: string;
  start: string;
  end: string;
};

export type CalendarMonth = {
  year: number;
  month: number;
  firstDay: Date;
  daysInMonth: number;
  offset: number;
  monthName: string;
  monthStart: number;
  monthEnd: number;
};

export const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function resolveCalendarMonth(
  params: { year?: unknown; month?: unknown },
  today: Date,
): CalendarMonth {
  const validParams = typeof params.year === "string" && /^\d{4}$/.test(params.year) &&
    Number(params.year) >= 1000 && typeof params.month === "string" && /^(?:[1-9]|1[0-2])$/.test(params.month);
  const year = validParams ? Number(params.year) : today.getFullYear();
  const month = validParams ? Number(params.month) - 1 : today.getMonth();
  const firstDay = new Date(year, month, 1);

  return {
    year,
    month,
    firstDay,
    daysInMonth: new Date(year, month + 1, 0).getDate(),
    offset: (firstDay.getDay() + 6) % 7,
    monthName: new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(firstDay),
    monthStart: firstDay.getTime(),
    monthEnd: new Date(year, month + 1, 1).getTime(),
  };
}

export function overlaps(event: CalendarEvent, start: number, end: number): boolean {
  const eventStart = Date.parse(event.start);
  const eventEnd = Date.parse(event.end);
  return eventStart < end && (eventEnd > start || (eventEnd === eventStart && eventStart >= start));
}

export function getMonthEvents(events: CalendarEvent[], monthStart: number, monthEnd: number): CalendarEvent[] {
  return events.filter((event) => overlaps(event, monthStart, monthEnd))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function getMonthLink(year: number, month: number, offset: number): string | null {
  const date = new Date(year, month + offset, 1);
  return date.getFullYear() >= 1000 && date.getFullYear() <= 9999
    ? `/?year=${date.getFullYear()}&month=${date.getMonth() + 1}` : null;
}

export async function getEvents(): Promise<CalendarEvent[]> {
  const response = await fetch("http://localhost:8000/dates", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Termine konnten nicht geladen werden");

  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Ungültige API-Antwort");
  return data.filter(isCalendarEvent);
}

function isCalendarEvent(event: unknown): event is CalendarEvent {
  if (event === null || typeof event !== "object") return false;

  const candidate = event as Record<string, unknown>;
  return typeof candidate.uuid === "string" && typeof candidate.title === "string" &&
    typeof candidate.description === "string" && typeof candidate.start === "string" &&
    typeof candidate.end === "string" && !Number.isNaN(Date.parse(candidate.start)) &&
    !Number.isNaN(Date.parse(candidate.end)) && Date.parse(candidate.end) >= Date.parse(candidate.start);
}