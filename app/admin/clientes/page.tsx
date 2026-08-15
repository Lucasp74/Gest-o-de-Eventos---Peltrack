import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { wallClockNow } from "@/lib/eventMap";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ClientsManager, { type AdminTenant } from "@/components/admin/ClientsManager";

export const metadata: Metadata = {
  title: "Clientes — Admin Peltrack",
  robots: { index: false, follow: false },
};

// A lista de clientes tem de refletir o banco a cada visita — nunca prerenderizar no build.
export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Quem tem evento ACONTECENDO HOJE. Suspender derruba o scanner na hora, então
  // o painel avisa antes de o admin clicar com uma portaria funcionando.
  // startAt é data de "relógio de parede" (dígitos digitados), por isso o dia
  // sai do wallClockNow e não de new Date(), que erraria em 3 horas.
  const agora = wallClockNow();
  const inicioHoje = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
  const fimHoje = new Date(inicioHoje.getTime() + 86_400_000);

  const [rows, hoje] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, events: true } },
        // dono do tenant (usuário mais antigo) — para exibir o e-mail no admin
        users: { orderBy: { createdAt: "asc" }, take: 1, select: { email: true } },
        events: {
          where: { createdAt: { gte: monthStart } },
          select: { id: true },
        },
      },
    }),
    // Uma consulta só para todos os clientes, em vez de uma por linha da lista.
    prisma.event.groupBy({
      by: ["tenantId"],
      where: { startAt: { gte: inicioHoje, lt: fimHoje } },
      _count: { _all: true },
    }),
  ]);

  const eventosHojePorTenant = new Map(hoje.map((h) => [h.tenantId, h._count._all]));

  const tenants: AdminTenant[] = rows.map((t) => ({
    id: t.id,
    name: t.name,
    plan: t.plan,
    monthlyPrice: t.monthlyPrice !== null ? Number(t.monthlyPrice) : null,
    maxEventsPerMonth: t.maxEventsPerMonth,
    maxGuestsPerEvent: t.maxGuestsPerEvent,
    flagAdvancedReports: t.flagAdvancedReports,
    flagDesktopSync: t.flagDesktopSync,
    flagApiAccess: t.flagApiAccess,
    apiKey: t.apiKey,
    users: t._count.users,
    ownerEmail: t.users[0]?.email ?? null,
    events: t._count.events,
    eventsThisMonth: t.events.length,
    suspendedAt: t.suspendedAt ? t.suspendedAt.toISOString() : null,
    eventsToday: eventosHojePorTenant.get(t.id) ?? 0,
  }));

  return (
    <div className="min-h-screen bg-fundo">
      <AdminSidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1 mb-8">
            Gerencie planos, limites e recursos de cada cliente. É aqui que você libera o Enterprise.
          </p>
          <ClientsManager tenants={tenants} />
        </div>
      </div>
    </div>
  );
}
