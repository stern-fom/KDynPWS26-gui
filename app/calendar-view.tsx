import Link from "next/link";
import { getMonthEvents, getMonthLink, overlaps, weekdays, type CalendarEvent, type CalendarMonth } from "./calendar-utils";

type CalendarViewProps = {
  month: CalendarMonth;
  today: Date;
  events: CalendarEvent[];
  error: boolean;
};

export default function CalendarView({ month, today, events, error }: CalendarViewProps) {
  const monthEvents = getMonthEvents(events, month.monthStart, month.monthEnd);

  return (
    <main className="calendar-page">
      <div className="calendar-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow"><span className="brand-icon">✳</span> MEIN KALENDER</p>
            <h1>Dein Monat im Überblick<span>.</span></h1>
            <p className="subtitle">Alle deine Termine, an einem Ort.</p>
          </div>
          <div className="today-label"><span /> Heute, {new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).format(today)}</div>
        </header>
        <section className="calendar-card" aria-label={`Kalender für ${month.monthName}`}>
          <div className="calendar-heading">
            <div><p className="section-label">MONATSÜBERSICHT</p><h2>{month.monthName}</h2></div>
            <div className="calendar-heading-actions">
              <nav className="calendar-nav" aria-label="Kalendernavigation">
                {[{ offset: -12, label: "Vorheriges Jahr", text: "«" }, { offset: -1, label: "Vorheriger Monat", text: "‹" }].map(({ offset, label, text }) => {
                  const href = getMonthLink(month.year, month.month, offset);
                  return href ? <Link key={offset} href={href} prefetch={false} aria-label={label}>{text}</Link> : <span key={offset} aria-label={`${label} nicht verfügbar`} aria-disabled="true">{text}</span>;
                })}
                <Link href="/" prefetch={false} className="today-link">Heute</Link>
                {[{ offset: 1, label: "Nächster Monat", text: "›" }, { offset: 12, label: "Nächstes Jahr", text: "»" }].map(({ offset, label, text }) => {
                  const href = getMonthLink(month.year, month.month, offset);
                  return href ? <Link key={offset} href={href} prefetch={false} aria-label={label}>{text}</Link> : <span key={offset} aria-label={`${label} nicht verfügbar`} aria-disabled="true">{text}</span>;
                })}
              </nav>
              <div className="event-count"><span className="count-dot" />{error ? "API nicht erreichbar" : `${monthEvents.length} ${monthEvents.length === 1 ? "Termin" : "Termine"} in diesem Monat`}</div>
            </div>
          </div>
          {error && <div className="error-message" role="alert">Die Termine konnten nicht geladen werden. Bitte prüfe, ob die API auf Port 8000 läuft, und lade die Seite erneut.</div>}
          <div className="calendar-scroll">
            <div className="calendar-grid">
              {weekdays.map((day) => <div className="weekday" key={day}>{day}</div>)}
              {Array.from({ length: Math.ceil((month.offset + month.daysInMonth) / 7) * 7 }, (_, index) => {
                const day = index - month.offset + 1;
                if (day < 1 || day > month.daysInMonth) return <div className="day-cell empty" key={index} />;
                const start = new Date(month.year, month.month, day).getTime();
                const end = new Date(month.year, month.month, day + 1).getTime();
                const dayEvents = monthEvents.filter((event) => overlaps(event, start, end));
                const isToday = month.year === today.getFullYear() && month.month === today.getMonth() && day === today.getDate();
                return <div className={`day-cell${isToday ? " today" : ""}`} key={index}>
                  <span className="day-number" aria-label={isToday ? `${day}, heute` : `${day}`}>{day}</span>
                  <div className="day-events">{dayEvents.map((event) => <div className="event" key={event.uuid} title={`${event.title}${event.description ? ` – ${event.description}` : ""}`}>
                    <span className="event-time">{new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.start))}</span>
                    <span className="event-title">{event.title}</span>
                  </div>)}</div>
                </div>;
              })}
            </div>
          </div>
          {!error && monthEvents.length === 0 && <p className="empty-message">Für diesen Monat sind noch keine Termine eingetragen.</p>}
          <footer className="calendar-footer"><span><span className="footer-dot" /> Heute</span><span>Dein Monat, ganz entspannt.</span></footer>
        </section>
      </div>
    </main>
  );
}