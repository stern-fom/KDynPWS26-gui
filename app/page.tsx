import { Suspense } from "react";
import Calendar from "./calendar";

export default function Home({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  return <Suspense fallback={<main className="calendar-page">Kalender wird geladen …</main>}><Calendar searchParams={searchParams} /></Suspense>;
}
