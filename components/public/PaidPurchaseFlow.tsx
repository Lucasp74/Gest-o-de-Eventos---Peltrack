"use client";

/**
 * Fluxo de compra de ingresso pago: escolher tipo → dados → gerar Pix.
 * Mostra o QR Pix + copia-e-cola. A liberação do convite após o pagamento
 * é feita pelo webhook (tarefa de 09/07) — aqui fica "aguardando pagamento".
 */
import { useState, useEffect } from "react";
import { QrCode, Loader2, Copy, Check, Ticket, Mail, PartyPopper, CalendarX, Minus, Plus, Clock } from "lucide-react";
import { type EventItem, type TicketType } from "@/lib/mockEvents";
import { formatBRL } from "@/lib/planPricing";

type PixResult = {
  paymentId: string;
  brCode: string;
  brCodeBase64: string;
  quantity: number;
  ticketPrice: number;
  subtotal: number;
  fee: number;
  total: number;
  passFeeToBuyer?: boolean;
};

/** Dias inteiros até a data-limite do lote. O valor é wall-clock e o navegador
 *  do comprador está no mesmo fuso — serve para o RÓTULO; quem decide se o lote
 *  ainda vale é o servidor (batchState). */
function diasAte(closesAt?: string): number | null {
  if (!closesAt) return null;
  const alvo = new Date(closesAt).getTime();
  if (Number.isNaN(alvo)) return null;
  return Math.max(0, Math.ceil((alvo - Date.now()) / 86_400_000));
}

const prazoLabel = (dias: number) => (dias <= 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`);

/** Estoque restante só quando vale mostrar escassez (últimas 10 unidades ou 20%). */
function restantesParaAlerta(t: TicketType): number | null {
  if (!t.quantity || t.quantity <= 0) return null; // 0 = ilimitado
  const restam = t.quantity - t.sold;
  if (restam <= 0) return null;
  return restam <= 10 || restam <= t.quantity * 0.2 ? restam : null;
}

/** Máscara de CPF: 000.000.000-00 (guarda o texto formatado; os dígitos saem no envio). */
function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function PaidPurchaseFlow({ event }: { event: EventItem }) {
  const tickets = event.tickets ?? [];
  const pct = event.feePct ?? 0.08;

  // Modo LOTES: a fila e a vigência vêm prontas do servidor (batchState).
  const batchMode = event.batchMode ?? false;
  const vigente = batchMode ? tickets.find((t) => t.batchState === "vigente") ?? null : null;
  const proximo = batchMode ? tickets.find((t) => t.batchState === "futuro") ?? null : null;

  const totalComTaxa = (t: TicketType) => {
    const fee = Math.round(t.price * (event.feePct ?? 0.08) * 100) / 100;
    return (t.passFeeToBuyer ?? true) ? Math.round((t.price + fee) * 100) / 100 : t.price;
  };

  // Em lotes não há escolha: o vigente já vem selecionado.
  const firstAvailable = batchMode ? vigente : tickets.find((t) => t.quantity === 0 || t.sold < t.quantity);
  const [ticketId, setTicketId] = useState<string | null>(firstAvailable?.id ?? null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<PixResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [payStatus, setPayStatus] = useState<"pendente" | "aprovado" | "expirado">("pendente");
  const [simulating, setSimulating] = useState(false);

  // Verifica o pagamento a cada 4s enquanto o Pix está na tela e pendente
  useEffect(() => {
    if (!pix || payStatus !== "pendente") return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/public/payments/${pix.paymentId}/status`);
        const data = await r.json();
        if (data.status === "aprovado") setPayStatus("aprovado");
        else if (data.status === "expirado") setPayStatus("expirado");
      } catch { /* segue tentando */ }
    }, 4000);
    return () => clearInterval(timer);
  }, [pix, payStatus]);

  const selected = tickets.find((t) => t.id === ticketId) ?? null;
  const selPass = selected?.passFeeToBuyer ?? true;
  const unitFee = selected ? Math.round(selected.price * pct * 100) / 100 : 0;
  // Repassa → comprador paga preço + taxa; absorve → comprador paga só o preço.
  const unitTotal = selected ? (selPass ? Math.round((selected.price + unitFee) * 100) / 100 : selected.price) : 0;

  // Limites por compra do ingresso selecionado (mín/máx + estoque disponível).
  const selMin = selected && selected.minPerOrder && selected.minPerOrder > 0 ? selected.minPerOrder : 1;
  const selAvail = selected ? (selected.quantity > 0 ? selected.quantity - selected.sold : Infinity) : 0;
  const selMax = selected
    ? Math.min(selected.maxPerOrder && selected.maxPerOrder > 0 ? selected.maxPerOrder : Infinity, selAvail)
    : 1;
  const grandTotal = Math.round(unitTotal * quantity * 100) / 100;

  // Ao trocar de ingresso, ajusta a quantidade para o mínimo dele.
  useEffect(() => {
    const t = tickets.find((x) => x.id === ticketId);
    setQuantity(t?.minPerOrder && t.minPerOrder > 0 ? t.minPerOrder : 1);
  }, [ticketId, tickets]);

  // Botão de teste (dev): marca o Pix como pago e checa o status na hora
  async function simulate() {
    if (!pix) return;
    setSimulating(true);
    await fetch(`/api/public/payments/${pix.paymentId}/simulate`, { method: "POST" }).catch(() => {});
    const r = await fetch(`/api/public/payments/${pix.paymentId}/status`).then((x) => x.json()).catch(() => ({}));
    setSimulating(false);
    if (r.status === "aprovado") setPayStatus("aprovado");
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!ticketId) return setError("Selecione um ingresso.");
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Preencha nome e um e-mail válido.");
    }
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      return setError("Informe um CPF válido (11 dígitos).");
    }
    setSubmitting(true);
    const res = await fetch(`/api/public/events/${event.id}/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), cpf: cpfDigits, ticketTypeId: ticketId, quantity }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok) setPix(data);
    else setError(data.error ?? "Não foi possível gerar a cobrança.");
  }

  /* ── Pagamento confirmado ────────────────────────── */
  if (pix && payStatus === "aprovado") {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <PartyPopper className="w-7 h-7 text-green-600" />
        </div>
        <h2 className="text-foreground font-bold text-lg mb-1">Pagamento confirmado!</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          {pix.quantity > 1 ? (
            <>Seus {pix.quantity} ingressos com QR Code foram enviados para <span className="font-semibold text-foreground">{email}</span>. Apresente-os na entrada do evento.</>
          ) : (
            <>Seu convite com QR Code foi enviado para <span className="font-semibold text-foreground">{email}</span>. Apresente-o na entrada do evento.</>
          )}
        </p>
      </div>
    );
  }

  /* ── Pix expirado ────────────────────────────────── */
  if (pix && payStatus === "expirado") {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mx-auto mb-4">
          <CalendarX className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-foreground font-bold text-lg mb-1">Pix expirado</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          O tempo para pagamento acabou. Recarregue a página para gerar uma nova cobrança.
        </p>
      </div>
    );
  }

  /* ── Tela do Pix ─────────────────────────────────── */
  if (pix) {
    // Um resumo existe para DECOMPOR um valor. Sem taxa e com um ingresso só não
    // há o que decompor, e o quadro acabava repetindo o mesmo número em duas
    // linhas, com um divisor no meio — parecia uma linha sem rótulo.
    const mostraTaxa = (pix.passFeeToBuyer ?? true) && pix.fee > 0;
    const decompoe = mostraTaxa || pix.quantity > 1;

    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-2 text-laranja mb-1">
          <QrCode className="w-5 h-5" />
          <h2 className="text-foreground font-bold text-lg">Pague com Pix para garantir seu ingresso</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-5">
          Escaneie o QR Code ou use o código copia-e-cola no app do seu banco.
        </p>

        <div className="flex flex-col items-center">
          {pix.brCodeBase64 ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={pix.brCodeBase64} alt="QR Code Pix" className="w-56 h-56 border border-border rounded-xl p-2 bg-white" />
          ) : (
            <div className="w-56 h-56 bg-muted rounded-xl animate-pulse" />
          )}

          <button
            onClick={() => { navigator.clipboard?.writeText(pix.brCode); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
            className="mt-4 flex items-center gap-2 border border-border hover:border-laranja hover:text-laranja text-foreground text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            {copied ? <><Check className="w-4 h-4 text-green-600" /> Código copiado!</> : <><Copy className="w-4 h-4" /> Copiar código Pix</>}
          </button>
        </div>

        {/* Resumo do valor. A taxa só aparece quando é repassada ao comprador. */}
        <div className="mt-6 bg-fundo/50 border border-border rounded-xl p-4 text-sm space-y-1.5">
          {decompoe && (
            <div className="flex justify-between text-muted-foreground">
              <span>{pix.quantity > 1 ? `Ingressos (${pix.quantity}× ${formatBRL(pix.ticketPrice)})` : "Ingresso"}</span>
              <span>{formatBRL(pix.subtotal)}</span>
            </div>
          )}
          {mostraTaxa && (
            <div className="flex justify-between text-muted-foreground"><span>Taxa de conveniência</span><span>{formatBRL(pix.fee)}</span></div>
          )}
          <div className={`flex justify-between text-foreground font-bold ${decompoe ? "pt-1.5 border-t border-border" : ""}`}>
            <span>Total</span><span>{formatBRL(pix.total)}</span>
          </div>
        </div>

        {/* Tinta translúcida, não amarelo-claro fixo: com bg-yellow-50 o texto
            (text-foreground) virava quase branco no tema escuro e sumia. */}
        <div className="mt-5 flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-3.5">
          <Loader2 className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0 animate-spin" />
          <p className="text-foreground text-sm">
            <span className="font-semibold">Aguardando pagamento.</span> Esta tela detecta o pagamento automaticamente, e assim que confirmar seu convite com QR Code é enviado por e-mail.
          </p>
        </div>

        {/* Botão de TESTE — só aparece em desenvolvimento */}
        {process.env.NODE_ENV !== "production" && (
          <button
            onClick={simulate}
            disabled={simulating}
            className="w-full mt-3 flex items-center justify-center gap-2 border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border text-sm py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {simulating ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulando...</> : "🧪 Simular pagamento (dev)"}
          </button>
        )}
      </div>
    );
  }

  /* ── Lotes: todos encerrados ─────────────────────── */
  if (batchMode && !vigente) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mx-auto mb-4">
          <CalendarX className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-foreground font-bold text-lg mb-1">Vendas encerradas</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Todos os lotes deste evento foram encerrados.
        </p>
      </div>
    );
  }

  /* ── Tela de seleção + dados ─────────────────────── */
  return (
    <form onSubmit={pay} className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-1">
        <Ticket className="w-5 h-5 text-laranja" />
        <h2 className="text-foreground font-bold text-lg">
          {batchMode ? "Lote disponível" : "Escolha seu ingresso"}
        </h2>
      </div>
      <p className="text-muted-foreground text-sm mb-5">A taxa de conveniência, quando aplicável, já está inclusa no total.</p>

      {error && (
        <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Ingressos (ou lotes, quando batchMode) */}
      <div className="space-y-2.5 mb-5">
        {tickets.map((t) => {
          const soldOut = t.quantity > 0 && t.sold >= t.quantity;
          const tPass = t.passFeeToBuyer ?? true;
          const tFee = Math.round(t.price * pct * 100) / 100;
          const tTotal = tPass ? Math.round((t.price + tFee) * 100) / 100 : t.price;

          /* ── Modo LOTES: sequência, sem escolha ──────────── */
          if (batchMode) {
            // Encerrado — riscado, faz o preço atual parecer bom (prova social).
            if (t.batchState === "encerrado") {
              return (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-border opacity-55">
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground line-through">{t.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Esgotado</p>
                  </div>
                  <span className="font-bold text-sm text-muted-foreground line-through">{formatBRL(tTotal)}</span>
                </div>
              );
            }

            // Futuro — âncora de preço: mostra quanto vai custar depois.
            if (t.batchState === "futuro") {
              return (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-dashed border-border">
                  <div>
                    <p className="font-semibold text-sm text-muted-foreground">{t.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">Ainda não liberado</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Depois: <span className="font-bold">{formatBRL(tTotal)}</span>
                  </span>
                </div>
              );
            }

            // Vigente — o único à venda, com os sinais de urgência.
            const restam = restantesParaAlerta(t);
            const dias = diasAte(t.closesAt);
            return (
              <div key={t.id} className="p-4 rounded-xl border-2 border-laranja bg-laranja/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {tPass && tFee > 0 ? `${formatBRL(t.price)} + ${formatBRL(tFee)} de taxa` : formatBRL(t.price)}
                    </p>
                  </div>
                  <span className="font-bold text-sm text-laranja flex-shrink-0">{formatBRL(tTotal)}</span>
                </div>
                {(restam !== null || dias !== null) && (
                  <div className="mt-2.5 pt-2.5 border-t border-laranja/20 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {restam !== null && (
                      <span className="font-semibold text-laranja">
                        {restam === 1 ? "Resta 1 ingresso neste lote" : `Restam ${restam} ingressos neste lote`}
                      </span>
                    )}
                    {dias !== null && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {proximo
                          ? `sobe para ${formatBRL(totalComTaxa(proximo))} ${prazoLabel(dias)}`
                          : `encerra ${prazoLabel(dias)}`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          }

          /* ── Modo normal: tipos simultâneos, o comprador escolhe ── */
          return (
            <button
              type="button"
              key={t.id}
              disabled={soldOut}
              onClick={() => setTicketId(t.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                ticketId === t.id ? "border-laranja bg-laranja/5" : "border-border hover:border-border"
              }`}
            >
              <div>
                <p className="font-semibold text-sm text-foreground">{t.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {soldOut ? "Esgotado" : tPass && tFee > 0 ? `${formatBRL(t.price)} + ${formatBRL(tFee)} de taxa` : formatBRL(t.price)}
                </p>
              </div>
              <span className={`font-bold text-sm ${ticketId === t.id ? "text-laranja" : "text-foreground"}`}>
                {formatBRL(tTotal)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quantidade */}
      {selected && selMax > 0 && (
        <div className="flex items-center justify-between mb-5 p-4 rounded-xl border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Quantidade</p>
            <p className="text-xs text-muted-foreground">
              {selMax !== Infinity ? `Máx. ${selMax} por compra` : "Sem limite por compra"}
              {selMin > 1 ? ` · mín. ${selMin}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(selMin, q - 1))}
              disabled={quantity <= selMin}
              aria-label="Diminuir"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-40 hover:border-laranja transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-foreground tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(selMax, q + 1))}
              disabled={quantity >= selMax}
              aria-label="Aumentar"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-40 hover:border-laranja transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dados */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Nome completo</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"
            className="w-full h-12 px-4 rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
            className="w-full h-12 px-4 rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja" />
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><Mail className="w-3 h-3" /> O convite será enviado para este e-mail após o pagamento.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">CPF</label>
          <input
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            placeholder="000.000.000-00"
            className="w-full h-12 px-4 rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja" />
          <p className="text-xs text-muted-foreground mt-1.5">Exigido pelo Pix para identificar o pagador.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !selected}
        className="w-full h-12 mt-5 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-laranja/25"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando Pix...</> : <><QrCode className="w-4 h-4" /> Pagar {selected ? formatBRL(grandTotal) : ""} com Pix</>}
      </button>
    </form>
  );
}
