import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import MercadoPagoConnect from "@/components/dashboard/MercadoPagoConnect";
import SubscriptionCard from "@/components/dashboard/SubscriptionCard";
import ReplyToCard from "@/components/dashboard/ReplyToCard";
import TeamCard from "@/components/dashboard/TeamCard";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Configurações — Peltrack",
};

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string; sub?: string }>;
}) {
  // Página inteira é do dono: plano, cobrança, integração bancária e equipe.
  const vinculo = await getCurrentMembership();
  if (vinculo && vinculo.papel !== "DONO") redirect("/dashboard");

  const tenantId = vinculo?.tenantId ?? null;
  const tenant = tenantId
    ? await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          mpConnectedAt: true, mpUserId: true, plan: true, subscriptionStatus: true,
          replyToEmail: true,
          // Dono da conta pelo PAPEL, não pela data de cadastro. Antes das
          // equipes "o mais antigo" era sempre o dono; agora não é mais.
          users: {
            where: { tenantRole: "DONO" },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { email: true },
          },
        },
      })
    : null;
  const { mp, sub } = await searchParams;

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground text-sm mt-1">Plano, pagamentos e integrações da sua conta.</p>
          </div>

          <SubscriptionCard
            plan={tenant?.plan ?? "STARTER"}
            subscriptionStatus={tenant?.subscriptionStatus ?? null}
            subFromQuery={sub ?? null}
          />

          <ReplyToCard
            initialEmail={tenant?.replyToEmail ?? null}
            ownerEmail={tenant?.users[0]?.email ?? null}
          />

          <MercadoPagoConnect
            connected={!!tenant?.mpConnectedAt}
            mpUserId={tenant?.mpUserId ?? null}
            statusFromOAuth={mp ?? null}
          />

          <TeamCard />
        </div>
      </div>
    </div>
  );
}
