/**
 * Checkout da mensalidade, na nossa página. Substitui o redirecionamento para o
 * init_point do Mercado Pago.
 *
 * O preço sai de effectiveMonthlyPrice, então um Enterprise com valor negociado
 * paga o combinado, e não o padrão da tabela.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/dashboard/Sidebar";
import SubscriptionCheckout from "@/components/dashboard/SubscriptionCheckout";
import { getCurrentMembership } from "@/lib/tenant";
import { effectiveMonthlyPrice, formatBRL } from "@/lib/planPricing";

export const metadata: Metadata = { title: "Assinatura — Peltrack" };

const LABEL = { PRO: "Pro", ENTERPRISE: "Enterprise" } as const;

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  if (plano !== "PRO" && plano !== "ENTERPRISE") redirect("/dashboard/configuracoes");

  const session = await auth();
  const vinculo = await getCurrentMembership();
  const email = session?.user?.email;
  if (!vinculo || !email) redirect("/login");
  // Mesma regra do servidor: assinar é ato do dono. Vai para /dashboard e não
  // para Configurações porque aquela página também rebate operador, e a
  // mensagem morreria no meio do caminho.
  if (vinculo.papel !== "DONO") redirect("/dashboard");

  const tenant = await prisma.tenant.findUnique({
    where: { id: vinculo.tenantId },
    select: { monthlyPrice: true, subscriptionStatus: true },
  });
  // Já assinante: barra antes de digitar o cartão. O servidor recusa de novo em
  // /api/subscription/create, mas ser recusado DEPOIS de preencher o cartão é
  // uma experiência ruim para uma regra que dá para checar aqui.
  if (tenant?.subscriptionStatus === "authorized") redirect("/dashboard/configuracoes?sub=ja_ativa");
  const price = effectiveMonthlyPrice(plano, tenant?.monthlyPrice ? Number(tenant.monthlyPrice) : null);
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? "";

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/dashboard/configuracoes"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Configurações
          </Link>

          <h1 className="text-2xl font-bold text-foreground mt-4">Assinar o plano {LABEL[plano]}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pagamento no cartão de crédito, com renovação automática todo mês.
          </p>

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6 mt-8 items-start">
            {/* Resumo */}
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
              <h2 className="text-foreground font-semibold">Resumo</h2>
              <div className="flex items-baseline justify-between gap-3 mt-4 pb-4 border-b border-border">
                <span className="text-muted-foreground text-sm">Peltrack {LABEL[plano]}</span>
                <span className="text-foreground font-semibold">
                  {price ? formatBRL(price) : "a combinar"}
                  <span className="text-muted-foreground font-normal text-sm">/mês</span>
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-4">
                A cobrança se repete todo mês na mesma data, até você cancelar. O cancelamento fica em
                Configurações e vale na hora.
              </p>
              <p className="flex items-start gap-2 text-muted-foreground text-xs mt-4 pt-4 border-t border-border">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                Cobrança processada pelo Mercado Pago. A Peltrack não guarda os dados do seu cartão.
              </p>
            </div>

            {/* Cartão */}
            <div>
              {!publicKey ? (
                <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
                  O pagamento por cartão ainda não está configurado nesta instalação. Fale com a gente pelo{" "}
                  <a href="mailto:contato@peltrack.com" className="text-laranja font-medium hover:underline">
                    contato@peltrack.com
                  </a>
                  .
                </div>
              ) : !price || price <= 0 ? (
                <div className="bg-card rounded-2xl border border-border p-6 text-sm text-muted-foreground">
                  O valor deste plano ainda não foi definido para a sua organização. Fale com a gente pelo{" "}
                  <a href="mailto:contato@peltrack.com" className="text-laranja font-medium hover:underline">
                    contato@peltrack.com
                  </a>
                  .
                </div>
              ) : (
                <SubscriptionCheckout
                  plan={plano}
                  planLabel={LABEL[plano]}
                  priceLabel={formatBRL(price)}
                  price={price}
                  publicKey={publicKey}
                  email={email}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
