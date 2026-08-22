"use client";

/**
 * Formulário de cartão do Mercado Pago, embutido na nossa página.
 *
 * Ele roda num iframe do MP, então o número do cartão nunca toca no nosso
 * código nem no nosso servidor. O que volta é um token de uso único. É isso que
 * nos mantém fora do escopo PCI.
 *
 * Dois usos hoje: a assinatura da mensalidade (cobrada na conta da Peltrack,
 * com a NOSSA public key) e a compra de ingresso (cobrada na conta do
 * organizador, com a public key DELE). Daí a chave vir por prop: no split,
 * quem tokeniza é sempre o vendedor.
 */
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

export type DadosCartao = {
  token?: string;
  installments?: number;
  payment_method_id?: string;
  issuer_id?: string;
};

type Brick = { unmount: () => void };
type MpBricks = { create: (tipo: string, container: string, cfg: unknown) => Promise<Brick> };
declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, opts?: { locale?: string }) => { bricks: () => MpBricks };
  }
}

export default function MpCardBrick({
  publicKey,
  amount,
  payerEmail,
  payerCpf,
  maxInstallments = 1,
  onToken,
  onErro,
}: {
  publicKey: string;
  amount: number;
  payerEmail: string;
  payerCpf?: string;
  maxInstallments?: number;
  /** Recebe o token e faz a cobrança. Lançar erro mantém o formulário ativo. */
  onToken: (dados: DadosCartao) => Promise<void>;
  onErro: (mensagem: string) => void;
}) {
  const [sdkPronto, setSdkPronto] = useState(false);
  const brickRef = useRef<Brick | null>(null);
  // O callback muda a cada render do pai; guardar em ref evita remontar o Brick
  // (e perder o que a pessoa já digitou) a cada tecla.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!sdkPronto || !window.MercadoPago || brickRef.current) return;
    let vivo = true;
    const falhou = () => onErro("Não foi possível carregar o formulário do cartão. Recarregue a página.");

    const cpf = (payerCpf ?? "").replace(/\D/g, "");
    const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
    mp.bricks()
      .create("cardPayment", "mp-card-brick", {
        initialization: {
          amount,
          payer: {
            email: payerEmail,
            ...(cpf.length === 11 ? { identification: { type: "CPF", number: cpf } } : {}),
          },
        },
        customization: {
          paymentMethods: { maxInstallments },
          visual: { style: { theme: "bootstrap" } },
        },
        callbacks: {
          onReady: () => {},
          onError: falhou,
          onSubmit: (dados: DadosCartao) => onTokenRef.current(dados),
        },
      })
      .then((b) => {
        if (vivo) brickRef.current = b;
        else b.unmount();
      })
      .catch(falhou);

    return () => {
      vivo = false;
      brickRef.current?.unmount();
      brickRef.current = null;
    };
    // onErro fora das deps de propósito: só o que muda o Brick entra aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkPronto, publicKey, amount, payerEmail, payerCpf, maxInstallments]);

  return (
    <>
      <Script src="https://sdk.mercadopago.com/js/v2" onReady={() => setSdkPronto(true)} />
      {!sdkPronto && (
        <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando o formulário seguro...
        </p>
      )}
      <div id="mp-card-brick" />
    </>
  );
}
