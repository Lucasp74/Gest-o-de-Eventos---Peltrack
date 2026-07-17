/**
 * Cancela a assinatura da mensalidade: cancela a preapproval no MP e rebaixa
 * o tenant para o plano Starter.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { cancelPreapproval } from "@/lib/mercadopago";
import { applyPlan } from "@/lib/subscription";

export async function POST() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { subscriptionId: true } });
  if (t?.subscriptionId) await cancelPreapproval(t.subscriptionId);

  await applyPlan(tenantId, "STARTER", { subscriptionStatus: "cancelled" });
  return NextResponse.json({ ok: true });
}
