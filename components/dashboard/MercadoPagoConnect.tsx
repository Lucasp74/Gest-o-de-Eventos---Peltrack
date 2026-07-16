"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const OAUTH_MSG: Record<string, { ok: boolean; text: string }> = {
  conectado: { ok: true, text: "Conta do Mercado Pago conectada com sucesso." },
  erro: { ok: false, text: "Não foi possível conectar. Tente novamente." },
  conta_em_uso: { ok: false, text: "Essa conta do Mercado Pago já está vinculada a outro cadastro." },
  indisponivel: { ok: false, text: "Integração de pagamento indisponível no momento." },
};

export default function MercadoPagoConnect({
  connected,
  mpUserId,
  statusFromOAuth,
}: {
  connected: boolean;
  mpUserId: string | null;
  statusFromOAuth: string | null;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);
  const msg = statusFromOAuth ? OAUTH_MSG[statusFromOAuth] : null;

  async function disconnect() {
    if (!confirm("Desconectar o Mercado Pago? Você não poderá vender ingressos pagos até reconectar.")) return;
    setDisconnecting(true);
    await fetch("/api/mercadopago/disconnect", { method: "POST" }).catch(() => {});
    setDisconnecting(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-laranja/10 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-5 h-5 text-laranja" />
        </div>
        <div>
          <h2 className="text-grafite font-semibold">Recebimento de pagamentos</h2>
          <p className="text-grafite-muted text-sm mt-0.5">
            Conecte sua conta do Mercado Pago para vender ingressos pagos. O valor do ingresso cai
            direto na sua conta; a Peltrack recebe apenas a taxa de conveniência.
          </p>
        </div>
      </div>

      {msg && (
        <div
          role="alert"
          className={`mb-4 flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
            msg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600"
          }`}
        >
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {connected ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-fundo/50 border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-grafite font-medium">Conta conectada</span>
            {mpUserId && <span className="text-grafite-muted">· conta #{mpUserId}</span>}
          </div>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-red-300 hover:text-red-500 text-grafite text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {disconnecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Desconectando...</> : "Desconectar"}
          </button>
        </div>
      ) : (
        <a
          href="/api/mercadopago/connect"
          className="inline-flex items-center gap-2 bg-laranja hover:bg-laranja-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-laranja/25"
        >
          <Wallet className="w-4 h-4" /> Conectar Mercado Pago
        </a>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Importante: sua conta do Mercado Pago precisa ter uma <span className="font-medium">chave Pix</span> cadastrada
        para receber por Pix.
      </p>
    </div>
  );
}
