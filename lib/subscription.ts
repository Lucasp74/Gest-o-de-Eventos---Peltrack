/**
 * Assinatura recorrente da mensalidade. Liga o status da preapproval do
 * Mercado Pago ao plano do Tenant (e aos limites/recursos do plano).
 */
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_DEFAULTS } from "@/lib/planPricing";
import { getPreapproval } from "@/lib/mercadopago";

type PlanKey = "STARTER" | "PRO" | "ENTERPRISE";

/** Aplica um plano ao tenant: muda plan + limites + flags para o padrão do plano. */
export async function applyPlan(tenantId: string, plan: PlanKey, extra: Prisma.TenantUpdateInput = {}) {
  const d = PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.STARTER;
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan,
      maxEventsPerMonth: d.maxEventsPerMonth,
      maxGuestsPerEvent: d.maxGuestsPerEvent,
      flagAdvancedReports: d.flagAdvancedReports,
      flagDesktopSync: d.flagDesktopSync,
      flagApiAccess: d.flagApiAccess,
      ...extra,
    },
  });
}

/**
 * Reconsulta a assinatura no MP e ajusta o tenant (guarda contra webhook forjado):
 * authorized → aplica o plano assinado; cancelled/paused → volta pra Starter.
 */
export async function syncSubscription(preapprovalId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { subscriptionId: preapprovalId },
    select: { id: true, subscriptionPlan: true },
  });
  if (!tenant) return;

  const { status } = await getPreapproval(preapprovalId);
  if (!status) return;

  if (status === "authorized") {
    const plan = (tenant.subscriptionPlan as PlanKey) ?? "PRO";
    await applyPlan(tenant.id, plan, { subscriptionStatus: "authorized" });
  } else if (status === "cancelled" || status === "paused") {
    await applyPlan(tenant.id, "STARTER", { subscriptionStatus: status });
  } else {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { subscriptionStatus: status } });
  }
}
