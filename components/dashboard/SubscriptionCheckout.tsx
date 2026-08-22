"use client";

/**
 * Assinatura da mensalidade paga na nossa página, sem o redirecionamento para o
 * checkout hospedado do Mercado Pago.
 *
 * O formulário de cartão vem do MpCardBrick, compartilhado com a compra de
 * ingresso. Aqui a cobrança é na conta da PRÓPRIA Peltrack, então a public key
 * é a nossa.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import MpCardBrick, { type DadosCartao } from "@/components/MpCardBrick";

export default function SubscriptionCheckout({
  plan,
  planLabel,
  priceLabel,
  price,
  publicKey,
  email,
}: {
  plan: "PRO" | "ENTERPRISE";
  planLabel: string;
  priceLabel: string;
  price: number;
  publicKey: string;
  email: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  async function assinar(dados: DadosCartao) {
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cardTokenId: dados.token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(body.error ?? "Não foi possível ativar a assinatura agora.");
        return;
      }
      setOk(true);
      router.refresh();
      setTimeout(() => router.push("/dashboard/configuracoes?sub=ativa"), 1800);
    } catch {
      setErro("Falha de conexão. Confira sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-foreground font-semibold">Assinatura ativa</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Seu plano {planLabel} já está liberado. A primeira cobrança de {priceLabel} aparece na fatura do
          cartão em até uma hora.
        </p>
      </div>
    );
  }

  return (
    <>
      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 text-sm bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
        {/* Mensalidade não parcela: é 1x por mês, todo mês. */}
        <MpCardBrick
          publicKey={publicKey}
          amount={price}
          payerEmail={email}
          maxInstallments={1}
          onToken={assinar}
          onErro={setErro}
        />
        {enviando && (
          <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm mt-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Ativando sua assinatura...
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Os dados do cartão vão direto para o Mercado Pago e não passam pelos servidores da Peltrack. A
        cobrança é mensal e automática, e você pode cancelar quando quiser em Configurações.
      </p>
    </>
  );
}
