/**
 * Cancela a assinatura da mensalidade: cancela a preapproval no MP e rebaixa
 * o tenant para o plano Starter.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/tenant";
import { cancelPreapproval } from "@/lib/mercadopago";
import { applyPlan } from "@/lib/subscription";

export async function POST() {
  const acesso = await exigirDono();
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status });
  const tenantId = acesso.tenantId;

  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { subscriptionId: true } });
  if (t?.subscriptionId) await cancelPreapproval(t.subscriptionId);

  await applyPlan(tenantId, "STARTER", { subscriptionStatus: "cancelled" });
  return NextResponse.json({ ok: true });
}
