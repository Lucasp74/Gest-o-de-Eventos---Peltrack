"use client";

import { Ticket, DollarSign, TrendingUp, QrCode, Gift } from "lucide-react";
import { type EventItem } from "@/lib/mockEvents";

function brl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function TicketsView({ event }: { event: EventItem }) {
  const tickets = event.tickets ?? [];
  const isPaid = (event.paid ?? false) && tickets.length > 0;

  /* Evento gratuito ou sem tipos cadastrados */
  if (!isPaid) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border py-16 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
          <Gift className="w-7 h-7 text-laranja" />
        </div>
        <h3 className="text-foreground font-semibold text-base mb-1">Este evento é gratuito</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Não há ingressos pagos. Os convidados confirmam presença sem cobrança e recebem o QR Code por e-mail.
        </p>
      </div>
    );
  }

  /* ── Métricas ──────────────────────────────────── */
  const totalSold = tickets.reduce((s, t) => s + t.sold, 0);
  const totalQty = tickets.reduce((s, t) => s + t.quantity, 0);
  const revenue = tickets.reduce((s, t) => s + t.sold * t.price, 0);
  const pctSold = totalQty > 0 ? Math.round((totalSold / totalQty) * 100) : 0;

  const stats = [
    { label: "Receita total", value: brl(revenue), icon: DollarSign, accent: true },
    { label: "Ingressos vendidos", value: `${totalSold} / ${totalQty}`, icon: Ticket },
    { label: "% vendido", value: `${pctSold}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Ingressos</h2>
        <p className="text-muted-foreground text-sm">Vendas e receita por tipo de ingresso</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 border border-border">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.accent ? "bg-laranja/10" : "bg-grafite/5"}`}>
              <s.icon className={`w-5 h-5 ${s.accent ? "text-laranja" : "text-foreground"}`} />
            </div>
            <p className={`text-2xl font-bold ${s.accent ? "text-laranja" : "text-foreground"}`}>{s.value}</p>
            <p className="text-muted-foreground text-sm mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela de tipos de ingresso */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-fundo text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Tipo de ingresso</div>
          <div className="col-span-2">Preço</div>
          <div className="col-span-3">Vendidos / Disponíveis</div>
          <div className="col-span-3 text-right">Receita</div>
        </div>

        <div className="divide-y divide-border">
          {tickets.map((t) => {
            const available = Math.max(t.quantity - t.sold, 0);
            const pct = t.quantity > 0 ? Math.round((t.sold / t.quantity) * 100) : 0;
            return (
              <div key={t.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center">
                {/* Nome */}
                <div className="md:col-span-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-4 h-4 text-laranja" />
                  </div>
                  <span className="text-foreground font-medium text-sm">{t.name}</span>
                </div>

                {/* Preço */}
                <div className="md:col-span-2 text-sm font-semibold text-foreground">{brl(t.price)}</div>

                {/* Vendidos / disponíveis + barra */}
                <div className="md:col-span-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{t.sold} vendidos</span>
                    <span className="text-muted-foreground">{available} restantes</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-laranja" : "bg-grafite"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Receita */}
                <div className="md:col-span-3 md:text-right">
                  <span className="text-sm font-semibold text-foreground">{brl(t.sold * t.price)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aviso Mercado Pago */}
      <div className="flex items-start gap-3 bg-grafite/5 rounded-2xl p-4">
        <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center flex-shrink-0">
          <QrCode className="w-4 h-4 text-foreground" />
        </div>
        <div>
          <p className="text-foreground font-semibold text-sm">Pagamentos via Mercado Pago (Pix)</p>
          <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
            As vendas e a receita aparecem aqui automaticamente assim que o pagamento Pix for confirmado.
          </p>
        </div>
      </div>
    </div>
  );
}
