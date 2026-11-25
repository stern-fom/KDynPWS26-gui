import { connection } from "next/server";
import CalendarView from "./calendar-view";
import { getEvents, resolveCalendarMonth, type CalendarEvent } from "./calendar-utils";

export default async function Calendar({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  await connection();
  const today = new Date();
  const params = await searchParams;
  const month = resolveCalendarMonth(params, today);
  let events: CalendarEvent[] = [];
  let error = false;

  try {
    events = await getEvents();
  } catch {
    error = true;
  }

  return <CalendarView month={month} today={today} events={events} error={error} />;
}