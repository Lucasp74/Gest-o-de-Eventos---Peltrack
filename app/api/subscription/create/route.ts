/**
 * Cria a assinatura da mensalidade (preapproval do Mercado Pago).
 *
 * O cartão é tokenizado NO NAVEGADOR e chega aqui só como token, então o número
 * nunca passa pelo nosso servidor. Com o token, a assinatura já nasce
 * "authorized" e a pessoa não sai do site — era esse redirecionamento para a
 * página do MP que incomodava (print de 20/08).
 *
 * A cobrança é na conta da PRÓPRIA Peltrack, não na do organizador. Por isso
 * aqui basta a nossa public key, sem o vaivém de OAuth do split de ingresso.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/tenant";
import { createPreapproval } from "@/lib/mercadopago";
import { effectiveMonthlyPrice } from "@/lib/planPricing";
import { applyPlan } from "@/lib/subscription";

export async function POST(req: Request) {
  const session = await auth();
  const vinculo = await getCurrentMembership();
  const email = session?.user?.email;
  if (!vinculo || !email) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }
  // Assinar o plano é ato do dono: mexe na cobrança da organização.
  if (vinculo.papel !== "DONO") {
    return NextResponse.json({ error: "Ação restrita ao dono da organização." }, { status: 403 });
  }
  const tenantId = vinculo.tenantId;

  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan ?? "");
  const cardTokenId = String(body.cardTokenId ?? "").trim();
  if (plan !== "PRO" && plan !== "ENTERPRISE") {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }
  if (!cardTokenId) {
    return NextResponse.json({ error: "Dados do cartão não recebidos." }, { status: 400 });
  }

  // ⚠️ O valor sai de effectiveMonthlyPrice, não do preço padrão do plano.
  // Antes daqui a rota usava só PLAN_DEFAULT_PRICE e IGNORAVA o monthlyPrice
  // negociado: um Enterprise combinado em R$ 200 era cobrado R$ 120.
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { monthlyPrice: true, subscriptionStatus: true },
  });

  // ⚠️ COBRANÇA DUPLICADA. Cada preapproval cobra por conta própria, e o tenant
  // só guarda UM subscriptionId. Assinar de novo por cima criaria uma segunda
  // assinatura ativa no MP que ninguém mais consegue enxergar nem cancelar pela
  // tela, cobrando o cliente duas vezes todo mês. Trocar de plano é cancelar e
  // assinar de novo.
  if (tenant?.subscriptionStatus === "authorized") {
    return NextResponse.json(
      { error: "Já existe uma assinatura ativa. Cancele a atual antes de assinar outro plano." },
      { status: 409 },
    );
  }
  const price = effectiveMonthlyPrice(plan, tenant?.monthlyPrice ? Number(tenant.monthlyPrice) : null);
  if (!price || price <= 0) {
    return NextResponse.json({ error: "Valor da assinatura não definido. Fale com a gente." }, { status: 400 });
  }

  const r = await createPreapproval({
    planLabel: `Peltrack ${plan === "PRO" ? "Pro" : "Enterprise"}`,
    amountReais: price,
    payerEmail: email,
    backUrl: new URL("/dashboard/configuracoes?sub=retorno", req.url).toString(),
    externalReference: tenantId,
    cardTokenId,
  });
  if (!r.ok) {
    // Detalhe do gateway vai para o LOG, nunca para a tela (lição de 15/08).
    console.error("[subscription create] falhou:", r.error);
    return NextResponse.json({ error: recusaEmPortugues(r.error) }, { status: 502 });
  }

  const autorizada = r.status === "authorized";
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionId: r.id, subscriptionStatus: r.status ?? "pending", subscriptionPlan: plan },
  });
  // Já autorizada: libera o plano na hora em vez de esperar o webhook. Ele
  // continua chegando e o syncSubscription reconfere, o que só reforça.
  if (autorizada) await applyPlan(tenantId, plan);

  return NextResponse.json({ ok: true, status: r.status, autorizada });
}

/**
 * Traduz a recusa do MP. A mensagem crua dele é jargão em inglês e às vezes
 * expõe como a cobrança funciona por dentro, que foi o que apareceu para um
 * comprador em 15/08.
 */
function recusaEmPortugues(erro?: string): string {
  const e = (erro ?? "").toLowerCase();
  if (e.includes("insufficient")) return "Cartão sem limite disponível. Tente outro cartão.";
  if (e.includes("security_code") || e.includes("cvv")) return "Código de segurança inválido. Confira os 3 dígitos do verso.";
  if (e.includes("expiration") || e.includes("expiry")) return "Data de validade inválida. Confira o mês e o ano do cartão.";
  if (e.includes("card_number") || e.includes("invalid card")) return "Número do cartão inválido. Confira os dígitos.";
  if (e.includes("blacklist") || e.includes("high_risk") || e.includes("rejected")) {
    return "O banco não autorizou a cobrança. Fale com ele ou tente outro cartão.";
  }
  return "Não foi possível ativar a assinatura agora. Confira os dados do cartão ou tente outro.";
}
