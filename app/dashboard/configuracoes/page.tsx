import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import MercadoPagoConnect from "@/components/dashboard/MercadoPagoConnect";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Configurações — Peltrack",
};

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const tenantId = await getCurrentTenantId();
  const tenant = tenantId
    ? await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { mpConnectedAt: true, mpUserId: true },
      })
    : null;
  const { mp } = await searchParams;

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-grafite">Configurações</h1>
            <p className="text-grafite-muted text-sm mt-1">Pagamentos e integrações da sua conta.</p>
          </div>

          <MercadoPagoConnect
            connected={!!tenant?.mpConnectedAt}
            mpUserId={tenant?.mpUserId ?? null}
            statusFromOAuth={mp ?? null}
          />
        </div>
      </div>
    </div>
  );
}
