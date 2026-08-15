"use client";

/**
 * Financeiro do cliente: consolidado de todos os eventos ou de um evento só,
 * conforme o seletor. É a mesma tela nos dois casos porque é o mesmo dado.
 */
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { ChevronDown, Wallet, Receipt, Ticket, TrendingUp, CircleDollarSign } from "lucide-react";
import { formatBRL } from "@/lib/planPricing";
import {
  ChartCard, EmptyChart, Legend, LARANJA, GRAY, tooltipStyle, eixoX, eixoY, moedaTooltip,
} from "@/components/dashboard/chartUi";

type Resumo = {
  bruto: number; taxa: number; liquido: number; ingressos: number; ticketMedio: number;
};

type Dados = {
  escopo: "todos" | "evento";
  resumo: Resumo;
  porDia: { dia: string; valor: number }[];
  porEvento: { nome: string; valor: number }[];
  porLote: { nome: string; valor: number; ingressos: number }[];
  conversao: { aprovados: number; pendentes: number; perdidos: number };
};

const PERIODOS = [
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "90 dias" },
  { dias: 0, label: "Tudo" },
];

/** Eixo de valores em formato curto: "R$ 1,2 mil" não cabe, "1,2k" cabe. */
const curto = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : String(v);

export default function FinanceView() {
  const [eventos, setEventos] = useState<{ id: string; name: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState<Dados | null>(null);
  // Guarda QUAL combinação já foi carregada. Trocar evento ou período muda a
  // chave e a tela volta ao esqueleto sozinha, sem setState dentro do efeito.
  const [carregado, setCarregado] = useState<string | null>(null);
  const chave = `${eventId}|${dias}`;
  const carregando = carregado !== chave;

  useEffect(() => {
    fetch("/api/events")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string }[]) => setEventos(data))
      .catch(() => setEventos([]));
  }, []);

  useEffect(() => {
    let vivo = true;
    const qs = new URLSearchParams();
    if (eventId) qs.set("eventId", eventId);
    if (dias) qs.set("days", String(dias));

    const concluir = (d: Dados | null) => {
      if (!vivo) return;
      setDados(d);
      setCarregado(`${eventId}|${dias}`);
    };

    fetch(`/api/finance?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(concluir)
      .catch(() => concluir(null));

    return () => { vivo = false; };
  }, [eventId, dias]);

  const r = dados?.resumo;
  const conv = dados?.conversao;
  const temMovimento = !!r && (r.bruto > 0 || (conv?.pendentes ?? 0) > 0 || (conv?.perdidos ?? 0) > 0);

  const kpis = r
    ? [
        { label: "Você recebeu", value: formatBRL(r.liquido), icon: Wallet, accent: true },
        { label: "Total pago pelos compradores", value: formatBRL(r.bruto), icon: CircleDollarSign },
        { label: "Taxa Peltrack", value: formatBRL(r.taxa), icon: Receipt },
        { label: "Ingressos vendidos", value: String(r.ingressos), icon: Ticket },
        { label: "Média por ingresso", value: formatBRL(r.ticketMedio), icon: TrendingUp },
      ]
    : [];

  const conversao = conv
    ? [
        { name: "Pagos", value: conv.aprovados, color: LARANJA },
        { name: "Aguardando", value: conv.pendentes, color: "#f59e0b" },
        { name: "Não pagos", value: conv.perdidos, color: GRAY },
      ].filter((f) => f.value > 0)
    : [];

  const totalPix = (conv?.aprovados ?? 0) + (conv?.pendentes ?? 0) + (conv?.perdidos ?? 0);
  const taxaConversao = totalPix > 0 ? Math.round(((conv?.aprovados ?? 0) / totalPix) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cabeçalho + seletor de evento */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quanto seus eventos venderam e o que entrou na sua conta.
          </p>
        </div>

        {eventos.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Evento</span>
            <div className="relative">
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                aria-label="Selecionar evento"
                className="appearance-none w-full sm:w-64 h-11 pl-4 pr-10 rounded-xl border border-border bg-card
                  text-sm text-foreground font-medium outline-none cursor-pointer
                  focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all"
              >
                <option value="">Todos os eventos</option>
                {eventos.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </label>
        )}
      </div>

      {/* Período */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            onClick={() => setDias(p.dias)}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${
              dias === p.dias
                ? "bg-laranja text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : !temMovimento ? (
        <SemMovimento temEventos={eventos.length > 0} />
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {kpis.map((k) => (
              <div key={k.label} className="bg-card rounded-2xl p-5 border border-border">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${k.accent ? "bg-laranja/10" : "bg-grafite/5"}`}>
                  <k.icon className={`w-5 h-5 ${k.accent ? "text-laranja" : "text-foreground"}`} />
                </div>
                <p className={`text-xl font-bold ${k.accent ? "text-laranja" : "text-foreground"}`}>{k.value}</p>
                <p className="text-muted-foreground text-sm mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* O dinheiro não passa pela Peltrack: precisa estar escrito. */}
          <p className="text-xs text-muted-foreground -mt-2">
            Os valores caem direto na sua conta do Mercado Pago no momento da compra, já com a
            taxa descontada. Esta tela é o registro do que foi vendido, não um saldo a receber.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faturamento por dia */}
            <ChartCard
              title="Entradas por dia"
              subtitle="Quanto você recebeu em cada dia do período"
              full
            >
              {dados!.porDia.length === 0 ? (
                <EmptyChart message="Nenhuma venda no período" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dados!.porDia} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="finGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={LARANJA} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={LARANJA} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                    <XAxis dataKey="dia" {...eixoX} />
                    <YAxis {...eixoY} tickFormatter={curto} />
                    <Tooltip {...tooltipStyle} formatter={moedaTooltip("Recebido")} />
                    <Area type="monotone" dataKey="valor" stroke={LARANJA} strokeWidth={2.5} fill="url(#finGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Por evento (consolidado) ou por lote (evento selecionado) */}
            {dados!.escopo === "todos" ? (
              <ChartCard title="Receita por evento" subtitle="Qual evento trouxe mais dinheiro">
                {dados!.porEvento.length === 0 ? (
                  <EmptyChart message="Nenhuma venda no período" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dados!.porEvento} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" horizontal={false} />
                      <XAxis type="number" {...eixoX} tickFormatter={curto} />
                      <YAxis type="category" dataKey="nome" width={110} {...eixoY} />
                      <Tooltip {...tooltipStyle} formatter={moedaTooltip("Recebido")} />
                      <Bar dataKey="valor" fill={LARANJA} radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            ) : (
              <ChartCard title="Receita por lote" subtitle="Quanto cada lote ou tipo de ingresso rendeu">
                {dados!.porLote.length === 0 ? (
                  <EmptyChart message="Nenhuma venda no período" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dados!.porLote} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                      <XAxis dataKey="nome" {...eixoX} />
                      <YAxis {...eixoY} tickFormatter={curto} />
                      <Tooltip {...tooltipStyle} formatter={moedaTooltip("Recebido")} />
                      <Bar dataKey="valor" fill={LARANJA} radius={[6, 6, 0, 0]} maxBarSize={56} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            )}

            {/* Conversão do Pix */}
            <ChartCard title="Pix gerados" subtitle="Quantas cobranças viraram pagamento de fato">
              {conversao.length === 0 ? (
                <EmptyChart message="Nenhuma cobrança no período" />
              ) : (
                <div className="flex items-center gap-6">
                  <div className="flex-1 min-w-0" style={{ width: "60%" }}>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={conversao} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                          {conversao.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip {...tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {conversao.map((c) => (
                      <Legend key={c.name} color={c.color} label={c.name} value={c.value} />
                    ))}
                    <div className="pt-2 border-t border-border">
                      <p className="text-2xl font-bold text-laranja">{taxaConversao}%</p>
                      <p className="text-muted-foreground text-xs">viraram venda</p>
                    </div>
                  </div>
                </div>
              )}
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

/** Evento gratuito não gera cobrança: sem isso a tela vazia parece defeito. */
function SemMovimento({ temEventos }: { temEventos: boolean }) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border py-16 flex flex-col items-center text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
        <Wallet className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-foreground font-semibold text-base mb-1">Nenhuma venda por aqui ainda</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        {temEventos
          ? "Só aparecem aqui os eventos com ingresso pago. Evento gratuito não gera cobrança, então não entra no financeiro."
          : "Crie um evento com ingresso pago para acompanhar as vendas por aqui."}
      </p>
    </div>
  );
}
