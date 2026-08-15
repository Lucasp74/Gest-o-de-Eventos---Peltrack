/**
 * Agregação financeira (lógica pura, sem Prisma e sem rede).
 * Separada da rota /api/finance para poder ser conferida sozinha: a conta do
 * dinheiro e a virada de fuso são justamente o que não se enxerga na tela.
 *
 * REPASSE AO ORGANIZADOR = amount − feeAmount, SEMPRE (ver lib/planPricing.ts).
 * Vale tanto para quem repassa a taxa ao comprador quanto para quem a absorve.
 */

/**
 * Dia civil em São Paulo (YYYY-MM-DD).
 * ATENÇÃO: paidAt é um INSTANTE REAL, gravado pelo webhook, diferente das datas
 * de evento (dígitos digitados, ver wallClockNow em lib/eventMap.ts). Por isso
 * aqui a conversão de fuso é de verdade: sem ela uma compra das 22h cairia no
 * dia seguinte e a barra do gráfico ficaria no lugar errado.
 */
const fmtDiaSP = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const diaSP = (d: Date): string => fmtDiaSP.format(d);

/** Decimal do Prisma → number. */
export const num = (d: { toString(): string } | null): number => (d ? Number(d.toString()) : 0);

export const cent = (v: number): number => Math.round(v * 100) / 100;

/**
 * Preenche os dias sem venda com zero, do primeiro ao último dia com movimento.
 * Sem isso o gráfico de área ligaria dias distantes como se fossem vizinhos,
 * desenhando uma venda que não existiu.
 */
export function serieDiaria(porDia: Map<string, number>): { dia: string; valor: number }[] {
  const dias = [...porDia.keys()].sort();
  if (dias.length === 0) return [];

  const saida: { dia: string; valor: number }[] = [];
  // Meio-dia UTC: evita que somar 1 dia caia na virada por horário de verão.
  const cursor = new Date(`${dias[0]}T12:00:00Z`);
  const fim = new Date(`${dias[dias.length - 1]}T12:00:00Z`);

  while (cursor <= fim) {
    const iso = cursor.toISOString().slice(0, 10);
    saida.push({
      dia: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
      valor: cent(porDia.get(iso) ?? 0),
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return saida;
}

/** O que a agregação precisa saber de cada pagamento. */
export type PagamentoBruto = {
  quantity: number;
  amount: { toString(): string } | null;
  feeAmount: { toString(): string } | null;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  event: { id: string; name: string };
  ticketType: { name: string; sortOrder: number } | null;
};

export function agregar(pagamentos: PagamentoBruto[]) {
  let bruto = 0;
  let taxa = 0;
  let ingressos = 0;
  let aprovados = 0;
  let pendentes = 0;
  let perdidos = 0; // expirados + cancelados

  const porDia = new Map<string, number>();
  const porEvento = new Map<string, { nome: string; valor: number }>();
  const porLote = new Map<string, { nome: string; ordem: number; valor: number; ingressos: number }>();

  for (const p of pagamentos) {
    // DINHEIRO = SÓ O QUE FOI APROVADO. Os demais só medem quanto de Pix foi
    // gerado e nunca pago.
    if (p.status === "PENDENTE") { pendentes++; continue; }
    if (p.status !== "APROVADO") { perdidos++; continue; }

    aprovados++;
    const valor = num(p.amount);
    const fee = num(p.feeAmount);
    const liquido = valor - fee;

    bruto += valor;
    taxa += fee;
    ingressos += p.quantity;

    const dia = diaSP(p.paidAt ?? p.createdAt);
    porDia.set(dia, (porDia.get(dia) ?? 0) + liquido);

    const ev = porEvento.get(p.event.id) ?? { nome: p.event.name, valor: 0 };
    ev.valor += liquido;
    porEvento.set(p.event.id, ev);

    // ticketType nulo só aparece se o lote for apagado depois da venda
    // (onDelete: SetNull). Evento gratuito não gera Payment nenhum.
    const chave = p.ticketType?.name ?? "Sem lote";
    const lote = porLote.get(chave) ?? {
      nome: chave,
      ordem: p.ticketType?.sortOrder ?? 999,
      valor: 0,
      ingressos: 0,
    };
    lote.valor += liquido;
    lote.ingressos += p.quantity;
    porLote.set(chave, lote);
  }

  const liquido = bruto - taxa;

  return {
    resumo: {
      bruto: cent(bruto),
      taxa: cent(taxa),
      liquido: cent(liquido),
      ingressos,
      // Por INGRESSO, não por compra: é o número que o organizador usa para
      // precificar o próximo lote.
      ticketMedio: ingressos > 0 ? cent(liquido / ingressos) : 0,
    },
    porDia: serieDiaria(porDia),
    porEvento: [...porEvento.values()]
      .map((e) => ({ ...e, valor: cent(e.valor) }))
      .sort((a, b) => b.valor - a.valor),
    porLote: [...porLote.values()]
      .sort((a, b) => a.ordem - b.ordem)
      .map(({ nome, valor, ingressos: qtd }) => ({ nome, valor: cent(valor), ingressos: qtd })),
    conversao: { aprovados, pendentes, perdidos },
  };
}
