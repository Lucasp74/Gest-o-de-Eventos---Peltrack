import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
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

  const rows = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, events: true } },
      events: {
        where: { createdAt: { gte: monthStart } },
        select: { id: true },
      },
    },
  });

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
    events: t._count.events,
    eventsThisMonth: t.events.length,
  }));

  return (
    <div className="min-h-screen bg-fundo">
      <AdminSidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-grafite">Clientes</h1>
          <p className="text-grafite-muted text-sm mt-1 mb-8">
            Gerencie planos, limites e recursos de cada cliente. É aqui que você libera o Enterprise.
          </p>
          <ClientsManager tenants={tenants} />
        </div>
      </div>
    </div>
  );
}
