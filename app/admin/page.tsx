import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { GrowthChart, PlanDonut, type GrowthPoint } from "@/components/admin/OverviewCharts";
import { effectiveMonthlyPrice, formatBRL } from "@/lib/planPricing";
import { Building2, Users, Calendar, CheckCircle2, Inbox, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Visão geral — Admin Peltrack",
  robots: { index: false, follow: false },
};

// Métricas têm de refletir o banco a cada visita — nunca prerenderizar no build.
export const dynamic = "force-dynamic";

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Série mensal acumulada (clientes × usuários) desde o primeiro registro. */
function buildGrowthSeries(tenantDates: Date[], userDates: Date[]): GrowthPoint[] {
  const all = [...tenantDates, ...userDates];
  if (all.length === 0) return [];

  const first = new Date(Math.min(...all.map((d) => d.getTime())));
  const now = new Date();
  const points: GrowthPoint[] = [];

  const cursor = new Date(first.getFullYear(), first.getMonth(), 1);
  while (cursor <= now) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    points.push({
      month: `${MONTHS_PT[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`,
      clientes: tenantDates.filter((d) => d <= monthEnd).length,
      usuarios: userDates.filter((d) => d <= monthEnd).length,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

export default async function AdminDashboard() {
  const [tenants, users, events, confirmations, leads, tenantRows, userRows] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.event.count(),
    prisma.confirmation.count(),
    prisma.lead.count({ where: { status: "NOVO" } }),
    prisma.tenant.findMany({ select: { plan: true, monthlyPrice: true, createdAt: true } }),
    prisma.user.findMany({ select: { createdAt: true } }),
  ]);

  // Receita recorrente mensal (soma dos valores efetivos; Enterprise sem preço conta 0)
  const mrr = tenantRows.reduce((sum, t) => {
    const price = effectiveMonthlyPrice(t.plan, t.monthlyPrice ? Number(t.monthlyPrice) : null);
    return sum + (price ?? 0);
  }, 0);

  const growth = buildGrowthSeries(
    tenantRows.map((t) => t.createdAt),
    userRows.map((u) => u.createdAt),
  );

  const byPlan = ["STARTER", "PRO", "ENTERPRISE"].map((plan) => ({
    plan,
    count: tenantRows.filter((t) => t.plan === plan).length,
  }));

  const stats = [
    { label: "Clientes", value: String(tenants), icon: Building2 },
    { label: "Usuários", value: String(users), icon: Users },
    { label: "Eventos", value: String(events), icon: Calendar },
    { label: "Confirmações", value: String(confirmations), icon: CheckCircle2 },
    { label: "Leads novos", value: String(leads), icon: Inbox },
    { label: "Receita mensal", value: formatBRL(mrr), icon: Wallet, accent: true },
  ];

  return (
    <div className="min-h-screen bg-fundo">
      <AdminSidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-grafite">Visão geral</h1>
          <p className="text-grafite-muted text-sm mt-1 mb-8">Métricas gerais da plataforma Peltrack.</p>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.accent ? "bg-laranja/10" : "bg-grafite/5"}`}>
                  <s.icon className={`w-5 h-5 ${s.accent ? "text-laranja" : "text-grafite"}`} />
                </div>
                <p className={`font-bold text-grafite ${s.value.length > 8 ? "text-lg" : "text-2xl"}`}>{s.value}</p>
                <p className="text-grafite-muted text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Crescimento acumulado */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
            <h2 className="text-grafite font-semibold">Crescimento da plataforma</h2>
            <p className="text-grafite-muted text-sm mb-4">Clientes e usuários acumulados por mês</p>
            {growth.length === 0 ? (
              <p className="text-grafite-muted text-sm py-12 text-center">Sem dados ainda.</p>
            ) : (
              <GrowthChart data={growth} />
            )}
          </div>

          {/* Distribuição por plano */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="text-grafite font-semibold">Clientes por plano</h2>
            <p className="text-grafite-muted text-sm mb-4">Distribuição atual da base</p>
            <PlanDonut data={byPlan} />
          </div>
        </div>
      </div>
    </div>
  );
}
