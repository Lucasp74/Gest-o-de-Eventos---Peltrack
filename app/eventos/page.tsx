import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import EventsShowcase, { type ShowcaseEvent } from "@/components/public/EventsShowcase";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Eventos — Peltrack",
  description: "Descubra eventos públicos e garanta sua presença.",
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const p = (n: number) => String(n).padStart(2, "0");

// A vitrine reflete o que está no banco a cada visita
export const dynamic = "force-dynamic";

export default async function EventosPage() {
  const rows = await prisma.event.findMany({
    where: { visibility: "PUBLICO", status: { not: "RASCUNHO" } },
    include: { tickets: { select: { price: true } } },
    orderBy: { startAt: "asc" },
  });

  // "Hoje" no fuso de São Paulo → "YYYY-MM-DD"
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const events: ShowcaseEvent[] = rows
    .map((e) => {
      const d = e.startAt; // wall-clock em UTC
      const dateStr = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
      const minPrice = e.tickets.length > 0 ? Math.min(...e.tickets.map((t) => Number(t.price))) : null;
      return {
        id: e.id,
        name: e.name,
        dateLabel: `${p(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        time: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
        dateStr,
        isToday: dateStr === todayStr,
        city: e.city,
        uf: e.uf,
        category: e.category,
        imageUrl: e.imageUrl,
        paid: e.paid,
        minPrice: e.paid ? minPrice : null,
      };
    })
    .filter((e) => e.dateStr >= todayStr); // hoje + futuros

  return (
    <div className="min-h-screen bg-fundo">
      <Navbar />
      <EventsShowcase events={events} />
    </div>
  );
}
