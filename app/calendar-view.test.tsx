// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CalendarView from "./calendar-view";
import { resolveCalendarMonth, type CalendarEvent, type CalendarMonth } from "./calendar-utils";

vi.mock("next/link", () => ({
  default: ({ href, children, prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode; prefetch?: boolean }) => {
    void prefetch;
    return <a href={href} {...props}>{children}</a>;
  },
}));

afterEach(cleanup);

const today = new Date(2024, 1, 14, 12);
const month = resolveCalendarMonth({ year: "2024", month: "2" }, today);

function event(uuid: string, title: string, start: string, end: string, description = ""): CalendarEvent {
  return { uuid, title, description, start, end };
}

function renderCalendar(overrides: {
  month?: CalendarMonth;
  today?: Date;
  events?: CalendarEvent[];
  error?: boolean;
} = {}) {
  return render(<CalendarView month={month} today={today} events={[]} error={false} {...overrides} />);
}

describe("CalendarView", () => {
  it("renders the month grid, weekday headers, and marks today accessibly", () => {
    const { container } = renderCalendar();

    expect(screen.getByRole("heading", { level: 2, name: "Februar 2024" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Kalender für Februar 2024" })).toBeTruthy();
    expect(Array.from(container.querySelectorAll(".weekday"), (day) => day.textContent)).toEqual(["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
    expect(container.querySelectorAll(".day-cell:not(.empty)")).toHaveLength(29);
    expect(screen.getByLabelText("14, heute")).toBeTruthy();
    expect(container.querySelector(".day-cell.today")).not.toBeNull();
  });

  it("renders links for previous and next month, year, and today", () => {
    renderCalendar();

    expect(screen.getByRole("link", { name: "Vorheriges Jahr" }).getAttribute("href")).toBe("/?year=2023&month=2");
    expect(screen.getByRole("link", { name: "Vorheriger Monat" }).getAttribute("href")).toBe("/?year=2024&month=1");
    expect(screen.getByRole("link", { name: "Heute" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Nächster Monat" }).getAttribute("href")).toBe("/?year=2024&month=3");
    expect(screen.getByRole("link", { name: "Nächstes Jahr" }).getAttribute("href")).toBe("/?year=2025&month=2");
  });

  it("shows events that overlap the month and their calendar days in start order", () => {
    const { container } = renderCalendar({
      events: [
        event("later", "Später", "2024-02-20T10:00:00", "2024-02-20T11:00:00"),
        event("earlier", "Früher", "2024-02-10T09:30:00", "2024-02-10T10:30:00", "Besprechung"),
        event("spanning", "Monatsübergreifend", "2024-01-31T23:00:00", "2024-02-02T01:00:00"),
        event("outside", "März", "2024-03-01T10:00:00", "2024-03-01T11:00:00"),
      ],
    });

    expect(Array.from(container.querySelectorAll(".event-title"), (title) => title.textContent)).toEqual([
      "Monatsübergreifend",
      "Monatsübergreifend",
      "Früher",
      "Später",
    ]);
    expect(container.querySelector(".event[title='Früher – Besprechung']")).not.toBeNull();
    const days = Array.from(container.querySelectorAll(".day-cell:not(.empty)"));
    expect(days[0].querySelector(".event-title")?.textContent).toBe("Monatsübergreifend");
    expect(days[1].querySelector(".event-title")?.textContent).toBe("Monatsübergreifend");
    expect(days[2].querySelector(".event-title")).toBeNull();
    expect(screen.getByText("09:30")).toBeTruthy();
    expect(screen.getByText("3 Termine in diesem Monat")).toBeTruthy();
  });

  it("shows the empty state and singular event count", () => {
    const { rerender } = renderCalendar();

    expect(screen.getByText("Für diesen Monat sind noch keine Termine eingetragen.")).toBeTruthy();
    expect(screen.getByText("0 Termine in diesem Monat")).toBeTruthy();

    rerender(<CalendarView
      month={month}
      today={today}
      events={[event("only", "Ein Termin", "2024-02-10T09:00:00", "2024-02-10T10:00:00")]}
      error={false}
    />);

    expect(screen.getByText("1 Termin in diesem Monat")).toBeTruthy();
    expect(screen.queryByText("Für diesen Monat sind noch keine Termine eingetragen.")).toBeNull();
  });

  it("shows an API error alert and omits the empty state", () => {
    renderCalendar({ error: true });

    expect(screen.getByRole("alert").textContent).toContain("Bitte prüfe, ob die API auf Port 8000 läuft");
    expect(screen.getByText("API nicht erreichbar")).toBeTruthy();
    expect(screen.queryByText("Für diesen Monat sind noch keine Termine eingetragen.")).toBeNull();
  });

  it("disables navigation beyond the supported year range", () => {
    const firstSupportedMonth = resolveCalendarMonth({ year: "1000", month: "1" }, today);
    const lastSupportedMonth = resolveCalendarMonth({ year: "9999", month: "12" }, today);

    const { rerender } = renderCalendar({ month: firstSupportedMonth });
    expect(screen.getByLabelText("Vorheriges Jahr nicht verfügbar").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByLabelText("Vorheriger Monat nicht verfügbar").getAttribute("aria-disabled")).toBe("true");

    rerender(<CalendarView month={lastSupportedMonth} today={today} events={[]} error={false} />);
    expect(screen.getByLabelText("Nächstes Jahr nicht verfügbar").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByLabelText("Nächster Monat nicht verfügbar").getAttribute("aria-disabled")).toBe("true");
  });
});