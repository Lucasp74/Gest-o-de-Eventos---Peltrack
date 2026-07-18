import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { serializeEvent } from "@/lib/eventMap";
import { STATUS_META, type EventItem } from "@/lib/mockEvents";
import {
  Plus, Calendar, Users, CheckCircle2, TrendingUp,
  ArrowUpRight, Clock, CalendarX,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Painel — Peltrack",
};

// Lê do banco a cada acesso (dados por tenant) — nunca pré-renderizar.
export const dynamic = "force-dynamic";

const EVENT_INCLUDE = {
  tickets: true,
  _count: { select: { confirmations: true, checkins: true } },
} as const;

const ACTIVE = new Set<EventItem["status"]>(["ativo", "inscricoes", "lotado"]);

function relTime(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR");
}

const initials = (name: string) =>
  name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase();

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.trim().split(" ")[0] ?? "bem-vindo(a)";
  const tenantId = await getCurrentTenantId();

  // Eventos reais do tenant (mesma query da lista) + atividade recente.
  const dbEvents = tenantId
    ? await prisma.event.findMany({ where: { tenantId }, include: EVENT_INCLUDE, orderBy: { createdAt: "desc" } })
    : [];
  const events: EventItem[] = dbEvents.map(serializeEvent);

  const [confs, checks] = tenantId
    ? await Promise.all([
        prisma.confirmation.findMany({
          where: { event: { tenantId } },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: { name: true, status: true, createdAt: true, event: { select: { name: true } } },
        }),
        prisma.checkin.findMany({
          where: { event: { tenantId } },
          orderBy: { checkedInAt: "desc" },
          take: 6,
          select: { name: true, checkedInAt: true, event: { select: { name: true } } },
        }),
      ])
    : [[], []];

  // Estatísticas reais
  const totalConfirmed = events.reduce((s, e) => s + e.confirmed, 0);
  const totalCheckedIn = events.reduce((s, e) => s + e.checkedIn, 0);
  const totalCapacity = events.reduce((s, e) => s + e.capacity, 0);
  const activeEvents = events.filter((e) => ACTIVE.has(e.status)).length;
  const occupancy = totalCapacity > 0 ? Math.round((totalConfirmed / totalCapacity) * 100) : 0;
  const attendance = totalConfirmed > 0 ? Math.round((totalCheckedIn / totalConfirmed) * 100) : 0;

  const stats = [
    { label: "Eventos ativos", value: String(activeEvents), sub: `${events.length} no total`, icon: Calendar },
    { label: "Total de convidados", value: totalConfirmed.toLocaleString("pt-BR"), sub: "confirmados", icon: Users },
    { label: "Presenças registradas", value: totalCheckedIn.toLocaleString("pt-BR"), sub: `${attendance}% de comparecimento`, icon: CheckCircle2 },
    { label: "Taxa de ocupação", value: `${occupancy}%`, sub: totalCapacity > 0 ? "das vagas" : "sem limite", icon: TrendingUp },
  ];

  // Atividade: confirmações + check-ins, do mais recente pro mais antigo.
  const activity = [
    ...confs.map((c) => ({
      name: c.name,
      action:
        c.status === "LISTA_ESPERA" ? "entrou na lista de espera"
        : c.status === "CANCELADO" ? "cancelou a presença"
        : "confirmou presença",
      event: c.event.name,
      at: c.createdAt,
    })),
    ...checks.map((c) => ({ name: c.name, action: "fez check-in", event: c.event.name, at: c.checkedInAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const shownEvents = events.slice(0, 4);

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />

      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Olá, {firstName} 👋</h1>
              <p className="text-muted-foreground text-sm mt-1">Aqui está o resumo dos seus eventos.</p>
            </div>
            <a
              href="/dashboard/eventos/criar"
              className="flex items-center justify-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-lg shadow-laranja/25"
            >
              <Plus className="w-4 h-4" />
              Criar evento
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-card rounded-2xl p-5 border border-border">
                <div className="w-10 h-10 rounded-xl bg-laranja/10 flex items-center justify-center mb-3">
                  <s.icon className="w-5 h-5 text-laranja" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-muted-foreground text-sm mt-0.5">{s.label}</p>
                <p className="text-muted-foreground/80 text-xs mt-2 font-medium">{s.sub}</p>
              </div>
            ))}
          </div>

          {events.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de eventos */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">Seus eventos</h2>
                  <a href="/dashboard/eventos" className="text-laranja text-sm font-medium hover:text-laranja-dark transition-colors">
                    Ver todos
                  </a>
                </div>

                <div className="space-y-4">
                  {shownEvents.map((e) => {
                    const meta = STATUS_META[e.status];
                    const pctFill = e.capacity > 0 ? Math.min(Math.round((e.confirmed / e.capacity) * 100), 100) : 0;
                    return (
                      <a
                        key={e.id}
                        href={`/dashboard/eventos/${e.id}`}
                        className="block bg-card rounded-2xl p-5 border border-border hover:shadow-md transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.className}`}>
                              {meta.label}
                            </span>
                            <h3 className="text-foreground font-semibold text-base truncate mt-1.5">{e.name}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-muted-foreground text-xs">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {e.dateLabel} · {e.time}
                              </span>
                              <span>·</span>
                              <span className="truncate">{e.local}</span>
                            </div>
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Confirmados</span>
                            <span className="font-semibold text-foreground">
                              {e.confirmed}{e.capacity > 0 ? ` / ${e.capacity}` : ""}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pctFill >= 100 ? "bg-laranja" : "bg-grafite"}`}
                              style={{ width: `${pctFill}%` }}
                            />
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Atividade recente */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">Atividade recente</h2>
                  {activity.length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Ao vivo
                    </span>
                  )}
                </div>

                <div className="bg-card rounded-2xl border border-border divide-y divide-border">
                  {activity.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground text-sm">Nenhuma atividade ainda.</p>
                      <p className="text-muted-foreground/70 text-xs mt-1">
                        Confirmações e check-ins aparecem aqui.
                      </p>
                    </div>
                  ) : (
                    activity.map((a, i) => (
                      <div key={i} className="p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-grafite/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-foreground text-xs font-bold">{initials(a.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-sm leading-snug">
                            <span className="font-semibold">{a.name}</span>{" "}
                            <span className="text-muted-foreground">{a.action}</span>
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5 truncate">{a.event}</p>
                          <p className="text-muted-foreground/70 text-xs mt-1">{relTime(a.at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
