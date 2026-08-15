/**
 * Conferência da agregação financeira. Sem framework, sem banco.
 *   npx tsx lib/finance.check.ts
 *
 * Cobre o que não dá para enxergar batendo o olho na tela: a conta do repasse
 * nos dois modos de taxa, a virada de fuso e os dias sem venda.
 */
import assert from "node:assert/strict";
import { agregar, diaSP, type PagamentoBruto } from "./finance";

const evento = { id: "ev1", name: "Festa Junina" };
const lote1 = { name: "1º lote", sortOrder: 0 };
const lote2 = { name: "2º lote", sortOrder: 1 };

const pgto = (p: Partial<PagamentoBruto>): PagamentoBruto => ({
  quantity: 1,
  amount: 0,
  feeAmount: 0,
  status: "APROVADO",
  createdAt: new Date("2026-08-05T12:00:00Z"),
  paidAt: new Date("2026-08-05T12:00:00Z"),
  event: evento,
  ticketType: lote1,
  ...p,
});

/* ── 1) O repasse é amount − feeAmount nos DOIS modos de taxa ────────────── */
{
  // Ingresso de R$100, taxa de 8%.
  // Repassa ao comprador: ele paga 108, o organizador recebe os 100 cheios.
  const repassa = pgto({ amount: 108, feeAmount: 8 });
  // Absorve: o comprador paga 100 e o organizador fica com 92.
  const absorve = pgto({ amount: 100, feeAmount: 8 });

  const { resumo } = agregar([repassa, absorve]);
  assert.equal(resumo.bruto, 208);
  assert.equal(resumo.taxa, 16);
  assert.equal(resumo.liquido, 192, "líquido tem que ser 100 + 92");
  assert.equal(resumo.ingressos, 2);
  assert.equal(resumo.ticketMedio, 96, "média é por ingresso, não por compra");
}

/* ── 2) Só APROVADO vira dinheiro ────────────────────────────────────────── */
{
  const r = agregar([
    pgto({ amount: 108, feeAmount: 8 }),
    pgto({ amount: 999, feeAmount: 99, status: "PENDENTE" }),
    pgto({ amount: 999, feeAmount: 99, status: "EXPIRADO" }),
    pgto({ amount: 999, feeAmount: 99, status: "CANCELADO" }),
  ]);
  assert.equal(r.resumo.bruto, 108, "pendente/expirado/cancelado não podem entrar na receita");
  assert.equal(r.resumo.ingressos, 1);
  assert.deepEqual(r.conversao, { aprovados: 1, pendentes: 1, perdidos: 2 });
}

/* ── 3) Fuso: compra da noite não pode pular para o dia seguinte ─────────── */
{
  // 01:30 UTC do dia 6 é 22:30 do dia 5 em São Paulo (UTC−3).
  assert.equal(diaSP(new Date("2026-08-06T01:30:00Z")), "2026-08-05");
  assert.equal(diaSP(new Date("2026-08-05T12:00:00Z")), "2026-08-05");
  // 03:00 UTC do dia 6 já é meia-noite do dia 6 no Brasil.
  assert.equal(diaSP(new Date("2026-08-06T03:00:00Z")), "2026-08-06");

  const r = agregar([
    pgto({ amount: 50, feeAmount: 0, paidAt: new Date("2026-08-06T01:30:00Z") }),
  ]);
  assert.deepEqual(r.porDia, [{ dia: "05/08", valor: 50 }], "venda das 22h30 pertence ao dia 5");
}

/* ── 4) Dias sem venda entram como zero ──────────────────────────────────── */
{
  const r = agregar([
    pgto({ amount: 10, feeAmount: 0, paidAt: new Date("2026-08-01T15:00:00Z") }),
    pgto({ amount: 20, feeAmount: 0, paidAt: new Date("2026-08-04T15:00:00Z") }),
  ]);
  assert.deepEqual(r.porDia, [
    { dia: "01/08", valor: 10 },
    { dia: "02/08", valor: 0 },
    { dia: "03/08", valor: 0 },
    { dia: "04/08", valor: 20 },
  ], "sem os zeros o gráfico ligaria 01/08 direto em 04/08");
}

/* ── 5) Lotes saem na ordem do formulário, não na ordem da venda ─────────── */
{
  const r = agregar([
    pgto({ amount: 30, feeAmount: 0, ticketType: lote2 }),
    pgto({ amount: 10, feeAmount: 0, ticketType: lote1 }),
    pgto({ amount: 5, feeAmount: 0, ticketType: null }),
  ]);
  assert.deepEqual(r.porLote.map((l) => l.nome), ["1º lote", "2º lote", "Sem lote"]);
  assert.equal(r.porLote[0].valor, 10);
}

/* ── 6) Eventos ordenados por quanto renderam ────────────────────────────── */
{
  const outro = { id: "ev2", name: "Réveillon" };
  const r = agregar([
    pgto({ amount: 10, feeAmount: 0 }),
    pgto({ amount: 90, feeAmount: 0, event: outro }),
  ]);
  assert.deepEqual(r.porEvento, [
    { nome: "Réveillon", valor: 90 },
    { nome: "Festa Junina", valor: 10 },
  ]);
}

/* ── 7) Cliente sem venda nenhuma não quebra a tela ──────────────────────── */
{
  const r = agregar([]);
  assert.deepEqual(r.resumo, { bruto: 0, taxa: 0, liquido: 0, ingressos: 0, ticketMedio: 0 });
  assert.deepEqual(r.porDia, []);
  assert.deepEqual(r.conversao, { aprovados: 0, pendentes: 0, perdidos: 0 });
}

/* ── 8) Centavos não podem acumular lixo de ponto flutuante ──────────────── */
{
  const r = agregar([
    pgto({ amount: 10.1, feeAmount: 0.81 }),
    pgto({ amount: 20.2, feeAmount: 1.62 }),
  ]);
  assert.equal(r.resumo.liquido, 27.87, "0.1 + 0.2 não pode virar 27.870000000000005");
}

console.log("financeiro: 8 cenários conferidos, tudo certo.");
