"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, LayoutGrid, List, Calendar, MapPin, Users,
  Clock, MoreHorizontal, QrCode, FileSpreadsheet, ArrowUpRight,
  CalendarX,
} from "lucide-react";
import {
  STATUS_META, type EventItem, type EventStatus,
} from "@/lib/mockEvents";

type FilterKey = "todos" | EventStatus;

const filters: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "ativo", label: "Ativos" },
  { key: "inscricoes", label: "Inscrições abertas" },
  { key: "lotado", label: "Lotados" },
  { key: "rascunho", label: "Rascunhos" },
  { key: "encerrado", label: "Encerrados" },
];

function pct(c: number, t: number) {
  return t === 0 ? 0 : Math.round((c / t) * 100);
}

export default function EventsView() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega os eventos do cliente logado a partir do banco (API)
  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EventItem[]) => setAllEvents(data))
      .catch(() => setAllEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      const matchFilter = filter === "todos" || e.status === filter;
      const matchQuery =
        query.trim() === "" ||
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.local.toLowerCase().includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [query, filter, allEvents]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: allEvents.length };
    for (const e of allEvents) map[e.status] = (map[e.status] ?? 0) + 1;
    return map;
  }, [allEvents]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus eventos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie todos os seus eventos em um só lugar.
          </p>
        </div>
        <a
          href="/dashboard/eventos/criar"
          className="flex items-center justify-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-lg shadow-laranja/25"
        >
          <Plus className="w-4 h-4" />
          Criar evento
        </a>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou local..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground outline-none
              placeholder:text-muted-foreground focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all"
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 self-start">
          <button
            onClick={() => setView("grid")}
            aria-label="Visualização em grade"
            className={`p-2 rounded-lg transition-colors ${
              view === "grid" ? "bg-grafite text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="Visualização em lista"
            className={`p-2 rounded-lg transition-colors ${
              view === "list" ? "bg-grafite text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.key
                ? "bg-grafite text-white border-grafite"
                : "bg-card text-muted-foreground border-border hover:border-border"
            }`}
          >
            {f.label}
            {counts[f.key] != null && (
              <span
                className={`text-xs px-1.5 rounded-full ${
                  filter === f.key ? "bg-white/20" : "bg-muted text-muted-foreground"
                }`}
              >
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
            <CalendarX className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-semibold text-base mb-1">
            {allEvents.length === 0 ? "Você ainda não tem eventos" : "Nenhum evento encontrado"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {allEvents.length === 0
              ? "Crie seu primeiro evento para começar a receber confirmações."
              : "Ajuste a busca ou os filtros para encontrar o que procura."}
          </p>
        </div>
      ) : view === "grid" ? (
        <GridView events={filtered} />
      ) : (
        <ListView events={filtered} />
      )}
    </div>
  );
}

/* ── Grid ──────────────────────────────────────────── */
function GridView({ events }: { events: EventItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {events.map((e) => {
        const meta = STATUS_META[e.status];
        const occupancy = pct(e.confirmed, e.capacity);
        return (
          <div
            key={e.id}
            className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
          >
            {/* Top accent */}
            <div className="h-1.5 bg-grafite" />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.className}`}>
                  {meta.label}
                </span>
                <div className="flex items-center gap-2">
                  {e.flow === "qrcode" ? (
                    <QrCode className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  )}
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-foreground font-semibold text-base leading-snug mb-3 min-h-[2.5rem]">
                {e.name}
              </h3>

              <div className="space-y-1.5 mb-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {e.dateLabel} · {e.time}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {e.local}
                </p>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> Confirmados
                  </span>
                  <span className="font-semibold text-foreground">
                    {e.confirmed}/{e.capacity}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${occupancy >= 100 ? "bg-laranja" : "bg-grafite"}`}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
              </div>

              <a
                href={`/dashboard/eventos/${e.id}`}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:border-laranja hover:text-laranja transition-colors"
              >
                Gerenciar
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── List ──────────────────────────────────────────── */
function ListView({ events }: { events: EventItem[] }) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-fundo text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="col-span-5">Evento</div>
        <div className="col-span-2">Data</div>
        <div className="col-span-2">Confirmados</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1 text-right">Ação</div>
      </div>

      <div className="divide-y divide-border">
        {events.map((e) => {
          const meta = STATUS_META[e.status];
          const occupancy = pct(e.confirmed, e.capacity);
          return (
            <div
              key={e.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center hover:bg-fundo/50 transition-colors"
            >
              {/* Name */}
              <div className="md:col-span-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-grafite/5 flex items-center justify-center flex-shrink-0">
                    {e.flow === "qrcode" ? (
                      <QrCode className="w-4 h-4 text-foreground" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground font-medium text-sm truncate">{e.name}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {e.local}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="md:col-span-2 text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 md:hidden" />
                {e.dateLabel}
              </div>

              {/* Confirmed */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {e.confirmed}/{e.capacity}
                  </span>
                  <div className="flex-1 max-w-[60px] h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${occupancy >= 100 ? "bg-laranja" : "bg-grafite"}`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.className}`}>
                  {meta.label}
                </span>
              </div>

              {/* Action */}
              <div className="md:col-span-1 md:text-right">
                <a
                  href={`/dashboard/eventos/${e.id}`}
                  className="inline-flex items-center gap-1 text-laranja text-sm font-medium hover:text-laranja-dark transition-colors"
                >
                  Abrir
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
