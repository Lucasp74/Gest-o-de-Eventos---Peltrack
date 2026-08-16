/**
 * Cancela a assinatura da mensalidade: cancela a preapproval no MP e rebaixa
 * o tenant para o plano Starter.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerTenantId } from "@/lib/tenant";
import { cancelPreapproval } from "@/lib/mercadopago";
import { applyPlan } from "@/lib/subscription";

export async function POST() {
  const tenantId = await getOwnerTenantId();
  if (!tenantId) return NextResponse.json({ error: "Ação restrita ao dono da organização." }, { status: 403 });

  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { subscriptionId: true } });
  if (t?.subscriptionId) await cancelPreapproval(t.subscriptionId);

  await applyPlan(tenantId, "STARTER", { subscriptionStatus: "cancelled" });
  return NextResponse.json({ ok: true });
}
