import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEvents, getMonthEvents, getMonthLink, overlaps, resolveCalendarMonth, type CalendarEvent } from "./calendar-utils";

const today = new Date(2024, 1, 15, 12);

function event(uuid: string, start: string, end: string): CalendarEvent {
  return { uuid, title: uuid, description: "", start, end };
}

describe("resolveCalendarMonth", () => {
  it("uses valid query parameters and calculates leap-year month details", () => {
    const month = resolveCalendarMonth({ year: "2024", month: "2" }, today);

    expect(month.year).toBe(2024);
    expect(month.month).toBe(1);
    expect(month.daysInMonth).toBe(29);
    expect(month.offset).toBe(3);
    expect(month.monthName).toBe("Februar 2024");
    expect(month.monthStart).toBe(new Date(2024, 1, 1).getTime());
    expect(month.monthEnd).toBe(new Date(2024, 2, 1).getTime());
  });

  it("defaults to today when either query parameter is missing or invalid", () => {
    const invalidParams = [
      {},
      { year: "2024" },
      { month: "2" },
      { year: "0999", month: "2" },
      { year: "10000", month: "2" },
      { year: "2024x", month: "2" },
      { year: "2024", month: "0" },
      { year: "2024", month: "13" },
      { year: "2024", month: "02" },
    ];

    for (const params of invalidParams) {
      const month = resolveCalendarMonth(params, today);
      expect([month.year, month.month]).toEqual([2024, 1]);
    }
  });

  it("calculates month lengths and Monday-first offsets", () => {
    expect(resolveCalendarMonth({ year: "2023", month: "2" }, today).daysInMonth).toBe(28);
    expect(resolveCalendarMonth({ year: "2024", month: "1" }, today).offset).toBe(0);
    expect(resolveCalendarMonth({ year: "2024", month: "5" }, today).offset).toBe(2);
  });
});

describe("event date handling", () => {
  it("treats normal event intervals as half-open and includes zero-duration events on their day", () => {
    const start = new Date(2024, 1, 10).getTime();
    const end = new Date(2024, 1, 11).getTime();

    expect(overlaps(event("during", "2024-02-10T12:00:00", "2024-02-10T13:00:00"), start, end)).toBe(true);
    expect(overlaps(event("ends-at-start", "2024-02-09T12:00:00", "2024-02-10T00:00:00"), start, end)).toBe(false);
    expect(overlaps(event("starts-at-end", "2024-02-11T00:00:00", "2024-02-11T01:00:00"), start, end)).toBe(false);
    expect(overlaps(event("instant", "2024-02-10T00:00:00", "2024-02-10T00:00:00"), start, end)).toBe(true);
    expect(overlaps(event("instant-at-end", "2024-02-11T00:00:00", "2024-02-11T00:00:00"), start, end)).toBe(false);
  });

  it("filters by month and sorts overlapping events by start time", () => {
    const start = new Date(2024, 1, 1).getTime();
    const end = new Date(2024, 2, 1).getTime();
    const events = [
      event("late", "2024-02-20T10:00:00", "2024-02-20T11:00:00"),
      event("outside", "2024-03-01T00:00:00", "2024-03-01T01:00:00"),
      event("early", "2024-02-02T10:00:00", "2024-02-02T11:00:00"),
      event("spanning", "2024-01-31T23:00:00", "2024-02-01T01:00:00"),
    ];

    expect(getMonthEvents(events, start, end).map(({ uuid }) => uuid)).toEqual(["spanning", "early", "late"]);
  });
});

describe("getMonthLink", () => {
  it("navigates across months and years", () => {
    expect(getMonthLink(2024, 0, -1)).toBe("/?year=2023&month=12");
    expect(getMonthLink(2024, 11, 1)).toBe("/?year=2025&month=1");
  });

  it("prevents navigation outside the supported four-digit years", () => {
    expect(getMonthLink(1000, 0, -12)).toBeNull();
    expect(getMonthLink(9999, 11, 1)).toBeNull();
    expect(getMonthLink(1000, 0, 1)).toBe("/?year=1000&month=2");
    expect(getMonthLink(9999, 11, -1)).toBe("/?year=9999&month=11");
  });
});

describe("getEvents", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches uncached events with a timeout and returns only valid entries", async () => {
    const validEvent = { uuid: "1", title: "Termin", description: "Info", start: "2024-02-10T09:00:00", end: "2024-02-10T10:00:00" };
    fetchMock.mockResolvedValue(new Response(JSON.stringify([
      validEvent,
      null,
      "not an object",
      {},
      { ...validEvent, uuid: 1 },
      { ...validEvent, title: 1 },
      { ...validEvent, description: 1 },
      { ...validEvent, start: 1 },
      { ...validEvent, start: "not a date" },
      { ...validEvent, end: 1 },
      { ...validEvent, end: "not a date" },
      { ...validEvent, end: "2024-02-10T08:00:00" },
    ]), { status: 200 }));

    await expect(getEvents()).resolves.toEqual([validEvent]);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/dates", {
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
  });

  it("returns an empty list for an empty response", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));

    await expect(getEvents()).resolves.toEqual([]);
  });

  it("rejects unsuccessful responses", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));

    await expect(getEvents()).rejects.toThrow("Termine konnten nicht geladen werden");
  });

  it("rejects non-array and malformed JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await expect(getEvents()).rejects.toThrow("Ungültige API-Antwort");

    fetchMock.mockResolvedValueOnce(new Response("invalid", { status: 200 }));
    await expect(getEvents()).rejects.toThrow();
  });
});