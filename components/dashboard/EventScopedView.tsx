"use client";

/**
 * Telas globais do sidebar (Convidados / Scanner / Relatórios). Reaproveita as
 * mesmas views das abas por-evento — só adiciona um seletor de evento no topo.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, CalendarX, Plus } from "lucide-react";
import { type EventItem } from "@/lib/mockEvents";
import { useEventRealtime } from "@/lib/pusherClient";
import GuestsView from "@/components/dashboard/GuestsView";
import ScannerView from "@/components/dashboard/ScannerView";
import ReportsView from "@/components/dashboard/ReportsView";

type Kind = "guests" | "scanner" | "reports";

const META: Record<Kind, { title: string; subtitle: string }> = {
  guests: { title: "Convidados", subtitle: "Veja e gerencie os convidados de cada evento." },
  scanner: { title: "Scanner", subtitle: "Valide a entrada lendo o QR Code dos convidados." },
  reports: { title: "Relatórios", subtitle: "Acompanhe os números e exporte os dados de cada evento." },
};

export default function EventScopedView({ kind }: { kind: Kind }) {
  const [events, setEvents] = useState<EventItem[] | null>(null); // null = carregando
  const [selectedId, setSelectedId] = useState<string>("");
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: EventItem[]) => {
        setEvents(data);
        if (data.length) setSelectedId(data[0].id);
      })
      .catch(() => setEvents([]));
  }, []);

  const selected = useMemo(
    () => events?.find((e) => e.id === selectedId) ?? null,
    [events, selectedId],
  );

  // Tempo real: ao mudar algo no evento selecionado, sinaliza a view p/ recarregar.
  useEventRealtime(selected?.id, useCallback(() => setLiveTick((t) => t + 1), []));

  const meta = META[kind];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabeçalho + seletor */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{meta.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta.subtitle}</p>
        </div>

        {events && events.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Evento</span>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                aria-label="Selecionar evento"
                className="appearance-none w-full sm:w-64 h-11 pl-4 pr-10 rounded-xl border border-border bg-card
                  text-sm text-foreground font-medium outline-none cursor-pointer
                  focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </label>
        )}
      </div>

      {/* Conteúdo */}
      {events === null ? (
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      ) : events.length === 0 ? (
        <EmptyState />
      ) : selected ? (
        kind === "guests" ? (
          <GuestsView event={selected} liveTick={liveTick} />
        ) : kind === "scanner" ? (
          <ScannerView event={selected} liveTick={liveTick} />
        ) : (
          <ReportsView event={selected} liveTick={liveTick} />
        )
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border py-16 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
        <CalendarX className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-foreground font-semibold text-base mb-1">Você ainda não tem eventos</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Crie seu primeiro evento para começar a receber confirmações.
      </p>
      <a
        href="/dashboard/eventos/criar"
        className="inline-flex items-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
      >
        <Plus className="w-4 h-4" /> Criar evento
      </a>
    </div>
  );
}
