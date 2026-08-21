"use client";

/**
 * Formulário de cartão da assinatura, dentro do nosso site.
 *
 * O Brick do Mercado Pago é quem desenha os campos do cartão, de propósito: ele
 * roda num iframe do MP, então o número do cartão nunca toca no nosso código
 * nem na nossa página. É isso que nos mantém fora do escopo PCI. O que ele nos
 * devolve é só um token de uso único.
 *
 * ponytail: Brick pronto em vez de campos nossos com tokenização manual. Se o
 * visual dos campos incomodar, o caminho é mp.fields (Secure Fields), que dá
 * controle total e custa bem mais código.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Brick = { unmount: () => void };
type MpBricks = {
  create: (tipo: string, container: string, cfg: unknown) => Promise<Brick>;
};
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => { bricks: () => MpBricks };
  }
}

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
  const [sdkPronto, setSdkPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const brickRef = useRef<Brick | null>(null);

  useEffect(() => {
    if (!sdkPronto || !window.MercadoPago || brickRef.current) return;
    let vivo = true;

    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    mp.bricks()
      .create("cardPayment", "mp-card-brick", {
        initialization: { amount: price, payer: { email } },
        // Assinatura é sempre 1x no mês: parcelamento não existe aqui.
        customization: { paymentMethods: { maxInstallments: 1 }, visual: { style: { theme: "bootstrap" } } },
        callbacks: {
          onReady: () => {},
          onError: () => setErro("Não foi possível carregar o formulário do cartão. Recarregue a página."),
          onSubmit: async (dados: { token?: string }) => {
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
              // Volta para Configurações já com o plano novo carregado do banco.
              router.refresh();
              setTimeout(() => router.push("/dashboard/configuracoes?sub=ativa"), 1800);
            } catch {
              setErro("Falha de conexão. Confira sua internet e tente de novo.");
            } finally {
              setEnviando(false);
            }
          },
        },
      })
      .then((b) => {
        if (vivo) brickRef.current = b;
        else b.unmount();
      })
      .catch(() => setErro("Não foi possível carregar o formulário do cartão. Recarregue a página."));

    return () => {
      vivo = false;
      brickRef.current?.unmount();
      brickRef.current = null;
    };
  }, [sdkPronto, publicKey, price, email, plan, router]);

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
      <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkPronto(true)} />

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
        {!sdkPronto && (
          <p className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando o formulário seguro...
          </p>
        )}
        <div id="mp-card-brick" />
        {enviando && (
          <p className="flex items-center gap-2 text-muted-foreground text-sm mt-4 justify-center">
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
