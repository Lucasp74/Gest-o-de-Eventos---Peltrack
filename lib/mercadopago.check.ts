/**
 * Checagem do corpo da assinatura.  Rodar:  npx tsx lib/mercadopago.check.ts
 *
 * Cobre o ramo que define a entrega de 21/08: com token de cartão a assinatura
 * nasce ativa e a pessoa não sai do site. Se isso regredir para "pending", o
 * sintoma é cruel: a tela diz que deu certo e o plano nunca ativa.
 */
import assert from "node:assert/strict";
import { preapprovalBody, recusaEmPortugues } from "./mercadopago";

const base = {
  planLabel: "Peltrack Pro",
  amountReais: 79.9,
  payerEmail: "lucas@exemplo.com",
  backUrl: "https://peltrack.com/dashboard/configuracoes?sub=retorno",
  externalReference: "tenant_123",
};

// COM cartão: ativa na hora, sem redirecionamento.
const comCartao = preapprovalBody({ ...base, cardTokenId: "tok_abc" });
assert.equal(comCartao.status, "authorized");
assert.equal(comCartao.card_token_id, "tok_abc");

// SEM cartão: continua o caminho antigo (checkout hospedado do MP).
const semCartao = preapprovalBody(base);
assert.equal(semCartao.status, "pending");
assert.equal("card_token_id" in semCartao, false, "não pode mandar card_token_id vazio");

// Token vazio conta como ausente: mandar card_token_id: "" faria o MP recusar.
assert.equal(preapprovalBody({ ...base, cardTokenId: "" }).status, "pending");

// Recorrência mensal em reais, com o valor arredondado a 2 casas.
const rec = comCartao.auto_recurring as Record<string, unknown>;
assert.deepEqual(rec, { frequency: 1, frequency_type: "months", transaction_amount: 79.9, currency_id: "BRL" });

// Valor negociado (Enterprise) passa inteiro, não é substituído por padrão nenhum.
const negociado = preapprovalBody({ ...base, planLabel: "Peltrack Enterprise", amountReais: 200, cardTokenId: "t" });
assert.equal((negociado.auto_recurring as { transaction_amount: number }).transaction_amount, 200);

// Centavos quebrados não podem virar dízima no JSON.
const quebrado = preapprovalBody({ ...base, amountReais: 79.905, cardTokenId: "t" });
assert.equal((quebrado.auto_recurring as { transaction_amount: number }).transaction_amount, 79.91);

// O tenant tem que viajar junto: é por ele que o webhook acha quem assinou.
assert.equal(comCartao.external_reference, "tenant_123");

console.log("mercadopago.check: 8 asserções ok");

// ── Recusa do cartão: o comprador tem que entender e saber o que fazer ──

const DETALHES = [
  "cc_rejected_insufficient_amount",
  "cc_rejected_bad_filled_security_code",
  "cc_rejected_bad_filled_date",
  "cc_rejected_bad_filled_card_number",
  "cc_rejected_bad_filled_other",
  "cc_rejected_call_for_authorize",
  "cc_rejected_card_disabled",
  "cc_rejected_duplicated_payment",
  "cc_rejected_high_risk",
  "cc_rejected_max_attempts",
];

// Cada motivo conhecido vira uma frase própria, e não a genérica.
const generica = recusaEmPortugues(undefined);
for (const d of DETALHES) {
  const msg = recusaEmPortugues(d);
  assert.notEqual(msg, generica, `${d} caiu no texto genérico`);
}

// Nenhuma mensagem pode vazar jargão do gateway. Foi o que um comprador leu em
// 15/08 ("You cannot use application_fee with this payment"), em inglês.
for (const d of [...DETALHES, undefined, null, "coisa_que_nao_existe"]) {
  const msg = recusaEmPortugues(d);
  assert.ok(msg.length > 20, `mensagem curta demais para ${d}`);
  assert.ok(!/cc_rejected|application_fee|_/.test(msg), `vazou jargão em ${d}: ${msg}`);
}

// Detalhe desconhecido não pode virar tela vazia nem "undefined".
assert.equal(recusaEmPortugues("qualquer_coisa"), generica);
assert.ok(!generica.includes("undefined"));

console.log("mercadopago.check: recusas de cartão ok");
