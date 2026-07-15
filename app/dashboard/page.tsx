import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import { auth } from "@/auth";
import {
  Plus, Calendar, Users, CheckCircle2, TrendingUp,
  MoreHorizontal, ArrowUpRight, Clock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Painel — Peltrack",
};

const stats = [
  { label: "Eventos ativos", value: "3", change: "+1 esta semana", icon: Calendar, up: true },
  { label: "Total de convidados", value: "1.284", change: "+218 este mês", icon: Users, up: true },
  { label: "Presenças registradas", value: "947", change: "74% de comparecimento", icon: CheckCircle2, up: true },
  { label: "Taxa de ocupação", value: "82%", change: "+5% vs. mês passado", icon: TrendingUp, up: true },
];

const events = [
  {
    name: "Formatura Engenharia — Turma 2024",
    date: "12 jun 2026 · 19:00",
    local: "Teatro Municipal",
    confirmed: 248,
    capacity: 250,
    status: "Ativo",
    statusColor: "bg-green-100 text-green-700 border-green-200",
    progress: 99,
  },
  {
    name: "Congresso de Tecnologia 2026",
    date: "28 jun 2026 · 09:00",
    local: "Centro de Convenções",
    confirmed: 412,
    capacity: 600,
    status: "Inscrições abertas",
    statusColor: "bg-blue-100 text-blue-700 border-blue-200",
    progress: 69,
  },
  {
    name: "Workshop de Inovação — RH",
    date: "05 jul 2026 · 14:00",
    local: "Auditório Empresa",
    confirmed: 50,
    capacity: 50,
    status: "Lotado",
    statusColor: "bg-laranja/10 text-laranja border-laranja/20",
    progress: 100,
  },
];

const activity = [
  { name: "Mariana Fernandes", action: "confirmou presença", event: "Formatura Engenharia", time: "há 2 min" },
  { name: "Carlos Eduardo", action: "fez check-in", event: "Congresso de Tecnologia", time: "há 8 min" },
  { name: "Ana Paula Santos", action: "entrou na lista de espera", event: "Workshop de Inovação", time: "há 15 min" },
  { name: "Ricardo Lima", action: "confirmou presença", event: "Congresso de Tecnologia", time: "há 23 min" },
  { name: "Fernanda Oliveira", action: "fez check-in", event: "Formatura Engenharia", time: "há 31 min" },
];

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.trim().split(" ")[0] ?? "bem-vindo(a)";
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />

      {/* Main content */}
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-grafite">Olá, {firstName} 👋</h1>
              <p className="text-grafite-muted text-sm mt-1">
                Aqui está o resumo dos seus eventos.
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

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-laranja/10 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-laranja" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-grafite">{s.value}</p>
                <p className="text-grafite-muted text-sm mt-0.5">{s.label}</p>
                <p className="text-green-600 text-xs mt-2 font-medium">{s.change}</p>
              </div>
            ))}
          </div>

          {/* Grid: events + activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Events list */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-grafite">Seus eventos</h2>
                <a href="#" className="text-laranja text-sm font-medium hover:text-laranja-dark transition-colors">
                  Ver todos
                </a>
              </div>

              <div className="space-y-4">
                {events.map((e) => (
                  <div
                    key={e.name}
                    className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${e.statusColor}`}>
                            {e.status}
                          </span>
                        </div>
                        <h3 className="text-grafite font-semibold text-base truncate">{e.name}</h3>
                        <div className="flex items-center gap-3 mt-1.5 text-grafite-muted text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {e.date}
                          </span>
                          <span>·</span>
                          <span>{e.local}</span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-grafite p-1 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-grafite-muted">Confirmados</span>
                        <span className="font-semibold text-grafite">
                          {e.confirmed} / {e.capacity}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${e.progress >= 100 ? "bg-laranja" : "bg-grafite"}`}
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity feed */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-grafite">Atividade recente</h2>
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Ao vivo
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {activity.map((a, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-grafite/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-grafite text-xs font-bold">
                        {a.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-grafite text-sm leading-snug">
                        <span className="font-semibold">{a.name}</span>{" "}
                        <span className="text-grafite-muted">{a.action}</span>
                      </p>
                      <p className="text-grafite-muted text-xs mt-0.5 truncate">{a.event}</p>
                      <p className="text-gray-400 text-xs mt-1">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
