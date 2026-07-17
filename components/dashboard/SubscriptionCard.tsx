"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { PLAN_DEFAULT_PRICE, formatBRL } from "@/lib/planPricing";

const PLAN_LABEL: Record<string, string> = { STARTER: "Starter", PRO: "Pro", ENTERPRISE: "Enterprise" };

const SUB_MSG: Record<string, { ok: boolean; text: string }> = {
  retorno: { ok: true, text: "Assinatura recebida. Assim que o Mercado Pago confirmar, seu plano é ativado (pode levar alguns instantes)." },
  erro: { ok: false, text: "Não foi possível iniciar a assinatura. Tente novamente." },
};

export default function SubscriptionCard({
  plan,
  subscriptionStatus,
  subFromQuery,
}: {
  plan: string;
  subscriptionStatus: string | null;
  subFromQuery: string | null;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const msg = subFromQuery ? SUB_MSG[subFromQuery] : null;
  const active = subscriptionStatus === "authorized";
  const pending = subscriptionStatus === "pending";

  async function cancel() {
    if (!confirm("Cancelar a assinatura? Seu plano volta para o Starter.")) return;
    setCancelling(true);
    await fetch("/api/subscription/cancel", { method: "POST" }).catch(() => {});
    setCancelling(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-laranja/10 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-5 h-5 text-laranja" />
        </div>
        <div>
          <h2 className="text-grafite font-semibold">Sua assinatura</h2>
          <p className="text-grafite-muted text-sm mt-0.5">
            Plano atual: <span className="font-medium text-grafite">{PLAN_LABEL[plan] ?? plan}</span>
            {active && " · ativo"}
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

      {active ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-fundo/50 border border-gray-100 rounded-xl p-4">
          <span className="flex items-center gap-2 text-sm text-grafite">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Assinatura ativa do plano <span className="font-medium">{PLAN_LABEL[plan]}</span>
          </span>
          <button
            onClick={cancel}
            disabled={cancelling}
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-red-300 hover:text-red-500 text-grafite text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {cancelling ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</> : "Cancelar assinatura"}
          </button>
        </div>
      ) : (
        <>
          {pending && (
            <div className="mb-4 flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl">
              <Clock className="w-4 h-4" /> Assinatura pendente de confirmação do Mercado Pago.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["PRO", "ENTERPRISE"] as const).map((p) => (
              <a
                key={p}
                href={`/api/subscription/create?plan=${p}`}
                className="flex items-center justify-between gap-2 border border-gray-200 hover:border-laranja rounded-xl px-4 py-3 transition-colors"
              >
                <span className="text-sm">
                  <span className="font-semibold text-grafite">Assinar {PLAN_LABEL[p]}</span>
                  <span className="block text-grafite-muted text-xs">{formatBRL(PLAN_DEFAULT_PRICE[p] ?? 0)}/mês</span>
                </span>
                <CreditCard className="w-4 h-4 text-laranja" />
              </a>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-gray-400 mt-4">
        A cobrança é mensal e automática no cartão, pelo Mercado Pago. Você pode cancelar a qualquer momento.
      </p>
    </div>
  );
}
