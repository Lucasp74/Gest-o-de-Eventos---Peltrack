"use client";

/**
 * Vitrine pública de eventos (/eventos): busca por nome, filtro por tipo
 * (categorias montadas dinamicamente) e por cidade, seção "Hoje" + próximos.
 * Cards levam para /e/[id] (confirmação / compra de ingresso).
 */
import { useMemo, useState } from "react";
import { Search, MapPin, Calendar, CalendarSearch, Ticket } from "lucide-react";
import { formatBRL } from "@/lib/planPricing";

export type ShowcaseEvent = {
  id: string;
  name: string;
  dateLabel: string;
  time: string;
  dateStr: string;
  isToday: boolean;
  city: string | null;
  uf: string | null;
  category: string | null;
  imageUrl: string | null;
  paid: boolean;
  minPrice: number | null;
};

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
}

export default function EventsShowcase({ events }: { events: ShowcaseEvent[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [city, setCity] = useState<string>("");

  const categories = useMemo(() => distinct(events.map((e) => e.category)), [events]);
  const cities = useMemo(() => distinct(events.map((e) => e.city)), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (category && e.category !== category) return false;
      if (city && e.city !== city) return false;
      if (q && !e.name.toLowerCase().includes(q) && !(e.city ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [events, query, category, city]);

  const today = filtered.filter((e) => e.isToday);
  const upcoming = filtered.filter((e) => !e.isToday);

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabeçalho */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-grafite">Descubra eventos</h1>
          <p className="text-grafite-muted mt-1">Encontre eventos públicos e garanta sua presença.</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou cidade..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-grafite outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all"
            />
          </div>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-grafite outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja lg:w-56"
          >
            <option value="">Todas as cidades</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Chips de categoria */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Chip active={category === null} onClick={() => setCategory(null)}>Todos</Chip>
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
            ))}
          </div>
        )}

        {/* Vazio */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
              <CalendarSearch className="w-7 h-7 text-gray-300" />
            </div>
            <h3 className="text-grafite font-semibold text-base mb-1">Nenhum evento encontrado</h3>
            <p className="text-grafite-muted text-sm max-w-xs">
              {events.length === 0
                ? "Ainda não há eventos públicos por aqui. Volte em breve!"
                : "Ajuste a busca ou os filtros para encontrar eventos."}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {today.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-laranja animate-pulse" />
                  <h2 className="text-lg font-bold text-grafite">Acontece hoje</h2>
                </div>
                <Grid events={today} />
              </section>
            )}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-grafite mb-4">
                  {today.length > 0 ? "Próximos eventos" : "Eventos"}
                </h2>
                <Grid events={upcoming} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
        active ? "bg-grafite text-white border-grafite" : "bg-white text-grafite-muted border-gray-200 hover:border-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function Grid({ events }: { events: ShowcaseEvent[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {events.map((e) => <Card key={e.id} event={e} />)}
    </div>
  );
}

function Card({ event: e }: { event: ShowcaseEvent }) {
  const price = e.paid
    ? e.minPrice && e.minPrice > 0 ? `a partir de ${formatBRL(e.minPrice)}` : "Pago"
    : "Grátis";

  return (
    <a
      href={`/e/${e.id}`}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Imagem ou placeholder */}
      <div className="relative aspect-[16/9] bg-grafite overflow-hidden">
        {e.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={e.imageUrl} alt={e.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-grafite to-grafite-light">
            <Calendar className="w-10 h-10 text-laranja/70" />
          </div>
        )}
        {e.category && (
          <span className="absolute top-3 left-3 bg-white/95 text-grafite text-xs font-semibold px-2.5 py-1 rounded-full">
            {e.category}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        <h3 className="text-grafite font-semibold leading-snug line-clamp-2 min-h-[2.6rem] group-hover:text-laranja transition-colors">
          {e.name}
        </h3>
        <div className="mt-2.5 space-y-1 text-sm text-grafite-muted">
          <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {e.dateLabel} · {e.time}</p>
          {(e.city || e.uf) && (
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {[e.city, e.uf].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-laranja" />
          <span className={`text-sm font-semibold ${e.paid ? "text-grafite" : "text-green-600"}`}>{price}</span>
        </div>
      </div>
    </a>
  );
}
