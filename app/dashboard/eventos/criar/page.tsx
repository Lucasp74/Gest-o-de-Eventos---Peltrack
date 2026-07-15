import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import CreateEventForm from "@/components/dashboard/CreateEventForm";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { feePct } from "@/lib/planPricing";

export const metadata: Metadata = {
  title: "Criar evento — Peltrack",
};

export default async function CriarEventoPage() {
  // Taxa de conveniência do plano do cliente — usada no preview "Você recebe".
  const tenantId = await getCurrentTenantId();
  const tenant = tenantId
    ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } })
    : null;
  const pct = feePct(tenant?.plan ?? "STARTER");

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <CreateEventForm feePct={pct} />
      </div>
    </div>
  );
}
