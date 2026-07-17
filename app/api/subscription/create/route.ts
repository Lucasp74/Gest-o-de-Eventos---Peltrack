/**
 * Cria a assinatura da mensalidade (preapproval do Mercado Pago) e redireciona
 * o organizador para o checkout hospedado do MP, onde ele cadastra o cartão.
 * O plano só vira ativo quando o webhook confirma "authorized".
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { createPreapproval } from "@/lib/mercadopago";
import { PLAN_DEFAULT_PRICE } from "@/lib/planPricing";

const back = (req: Request, s: string) =>
  NextResponse.redirect(new URL(`/dashboard/configuracoes?sub=${s}`, req.url));

export async function GET(req: Request) {
  const session = await auth();
  const tenantId = await getCurrentTenantId();
  const email = session?.user?.email;
  if (!tenantId || !email) return NextResponse.redirect(new URL("/login", req.url));

  const plan = new URL(req.url).searchParams.get("plan");
  if (plan !== "PRO" && plan !== "ENTERPRISE") return back(req, "erro");
  const price = PLAN_DEFAULT_PRICE[plan];
  if (!price) return back(req, "erro");

  const backUrl = new URL("/dashboard/configuracoes?sub=retorno", req.url).toString();
  const r = await createPreapproval({
    planLabel: `Peltrack ${plan === "PRO" ? "Pro" : "Enterprise"}`,
    amountReais: price,
    payerEmail: email,
    backUrl,
    externalReference: tenantId,
  });
  if (!r.ok || !r.initPoint) {
    console.error("[subscription create] falhou:", r.error);
    return back(req, "erro");
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionId: r.id, subscriptionStatus: r.status ?? "pending", subscriptionPlan: plan },
  });

  return NextResponse.redirect(r.initPoint);
}
