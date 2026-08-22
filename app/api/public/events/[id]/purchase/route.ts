/**
 * Compra PÚBLICA de ingresso pago: gera a cobrança Pix (Mercado Pago) e registra
 * um Payment PENDENTE com os dados do comprador. Suporta N ingressos por compra
 * (respeitando mín/máx do ingresso e o estoque). Os convites (N QRs) só são
 * liberados quando o pagamento é confirmado — via WEBHOOK (tarefa de 09/07).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCardCharge, createPixCharge, vendedorEhAPlataforma } from "@/lib/mercadopago";
import { getValidSellerToken } from "@/lib/mpAccount";
import { ticketCharge } from "@/lib/planPricing";
import { resolveBatches } from "@/lib/batches";
import { releasePaidPayment } from "@/lib/paymentRelease";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await _req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cpf = String(body.cpf ?? "").replace(/\D/g, "");
  const ticketTypeId = String(body.ticketTypeId ?? "");
  const quantity = Math.floor(Number(body.quantity ?? 1));
  // Ausente = Pix, que continua sendo o caminho padrão.
  const cardToken = String(body.cardToken ?? "").trim();
  const noCartao = cardToken.length > 0;

  if (!name || !emailOk(email)) {
    return NextResponse.json({ error: "Nome e e-mail válidos são obrigatórios." }, { status: 400 });
  }
  // O Pix do Mercado Pago exige o CPF do pagador.
  if (cpf.length !== 11) {
    return NextResponse.json({ error: "Informe um CPF válido (11 dígitos)." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { tenant: { select: { plan: true, mpUserId: true } }, tickets: true },
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  if (!event.paid) return NextResponse.json({ error: "Este evento é gratuito." }, { status: 400 });

  const ticket = event.tickets.find((t) => t.id === ticketTypeId);
  if (!ticket) return NextResponse.json({ error: "Ingresso inválido." }, { status: 400 });

  // Modo LOTES: só o lote vigente está à venda. A checagem é AQUI, no servidor,
  // de propósito — o ticketTypeId vem do navegador e pode ser forjado (console)
  // pra comprar um lote encerrado pelo preço antigo. Esconder na tela não basta.
  if (event.batchMode) {
    const { vigente } = resolveBatches(event.tickets);
    if (!vigente) {
      return NextResponse.json({ error: "As vendas foram encerradas.", code: "BATCH_OVER" }, { status: 409 });
    }
    if (vigente.id !== ticket.id) {
      return NextResponse.json({ error: "Este lote não está disponível para compra.", code: "BATCH_CLOSED" }, { status: 409 });
    }
  }

  // Estoque disponível (0 = ilimitado) e limites por compra.
  const available = ticket.quantity > 0 ? ticket.quantity - ticket.sold : Infinity;
  if (available <= 0) {
    return NextResponse.json({ error: "Ingresso esgotado.", code: "SOLD_OUT" }, { status: 409 });
  }
  const min = ticket.minPerOrder > 0 ? ticket.minPerOrder : 1;
  const max = ticket.maxPerOrder > 0 ? ticket.maxPerOrder : Infinity;
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }
  if (quantity < min) {
    return NextResponse.json({ error: `Mínimo de ${min} ingresso(s) por compra.`, code: "MIN" }, { status: 400 });
  }
  if (quantity > max) {
    return NextResponse.json({ error: `Máximo de ${max} ingresso(s) por compra.`, code: "MAX" }, { status: 400 });
  }
  if (quantity > available) {
    return NextResponse.json({ error: `Restam apenas ${available} ingresso(s).`, code: "STOCK" }, { status: 409 });
  }

  // Split: a cobrança sai na conta do organizador. Sem conexão MP, não há como vender.
  const sellerToken = await getValidSellerToken(event.tenantId);
  if (!sellerToken) {
    return NextResponse.json(
      { error: "Este organizador ainda não habilitou o recebimento de pagamentos." },
      { status: 503 },
    );
  }

  // Valor por unidade depende de quem paga a taxa; total = unidade × quantidade.
  const ticketPrice = Number(ticket.price);
  const { fee: unitFee, buyerTotal: unitTotal } = ticketCharge(event.tenant.plan, ticketPrice, ticket.passFeeToBuyer);

  // Evento da própria Peltrack: sem taxa. Cobrar de si mesmo não faz sentido, e
  // o MP RECUSA a cobrança inteira se ela vier com application_fee (foi o que
  // barrou uma compra real em 15/08). Mesmo teste do /api/public/events/[id],
  // que é quem desenha o preço na tela.
  const semTaxa = await vendedorEhAPlataforma(event.tenant.mpUserId);
  const fee = semTaxa ? 0 : Math.round(unitFee * quantity * 100) / 100; // receita Peltrack
  const total = semTaxa
    ? Math.round(ticketPrice * quantity * 100) / 100
    : Math.round(unitTotal * quantity * 100) / 100;

  const descricao = `${event.name} — ${ticket.name}${quantity > 1 ? ` (${quantity}x)` : ""}`;

  // ── Cartão: resposta definitiva na hora, sem tela de espera ──────
  if (noCartao) {
    const cobranca = await createCardCharge({
      sellerToken,
      applicationFee: fee,
      amountReais: total,
      description: descricao,
      cardToken,
      installments: Number(body.installments ?? 1),
      paymentMethodId: String(body.paymentMethodId ?? ""),
      issuerId: body.issuerId ? String(body.issuerId) : undefined,
      payerEmail: email,
      payerCpf: cpf,
    });
    if (!cobranca.ok || !cobranca.id) {
      console.error("[purchase] Mercado Pago recusou a cobrança no cartão", {
        eventId: id, ticketTypeId: ticket.id, total, fee, erro: cobranca.error,
      });
      return NextResponse.json(
        { error: "Não foi possível processar o cartão agora. Tente novamente ou pague com Pix." },
        { status: 502 },
      );
    }

    // Recusado NÃO vira Payment: tentativa de cartão não é venda, e registrar
    // sujaria o Financeiro com linhas que nunca viraram dinheiro.
    if (!cobranca.aprovado) {
      return NextResponse.json({ error: cobranca.recusa, code: "CARD_REJECTED" }, { status: 402 });
    }

    const pago = await prisma.payment.create({
      data: {
        eventId: id, ticketTypeId: ticket.id, quantity,
        buyerName: name, buyerEmail: email,
        amount: total, feeAmount: fee,
        status: "PENDENTE", providerId: cobranca.id,
      },
    });
    // Aprovado já: libera os QRs aqui mesmo, em vez de deixar a tela consultando
    // um status que nunca vai mudar. É idempotente, então o webhook chegando
    // depois não duplica nada.
    await releasePaidPayment(cobranca.id).catch((e) =>
      console.error("[purchase] cartão aprovado mas a liberação falhou", { paymentId: pago.id, e }),
    );

    return NextResponse.json({
      paymentId: pago.id,
      pago: true,
      quantity,
      ticketPrice,
      subtotal: Math.round(ticketPrice * quantity * 100) / 100,
      fee,
      total,
      passFeeToBuyer: ticket.passFeeToBuyer,
    }, { status: 201 });
  }

  const charge = await createPixCharge({
    sellerToken,
    applicationFee: fee, // taxa total da Peltrack — o MP separa no ato do pagamento
    amountReais: total,
    description: descricao,
    payerEmail: email,
    payerName: name,
    payerCpf: cpf,
  });
  if (!charge.ok || !charge.id) {
    // O detalhe do gateway vai para o LOG, nunca para a tela. Em 15/08 um
    // comprador leu "You cannot use application_fee with this payment", em
    // inglês: jargão interno do MP, inútil para ele e revelando como a nossa
    // cobrança funciona por dentro.
    console.error("[purchase] Mercado Pago recusou a cobrança", {
      eventId: id,
      ticketTypeId: ticket.id,
      total,
      fee,
      erro: charge.error,
    });
    const msg = charge.error === "PAGAMENTO_INDISPONIVEL"
      ? "Pagamento indisponível no momento. Tente mais tarde."
      : "Não foi possível gerar o Pix agora. Tente novamente em instantes ou fale com o organizador do evento.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const payment = await prisma.payment.create({
    data: {
      eventId: id,
      ticketTypeId: ticket.id,
      quantity,
      buyerName: name,
      buyerEmail: email,
      amount: total,
      feeAmount: fee,
      status: "PENDENTE",
      providerId: charge.id,
      brCode: charge.brCode ?? null,
      expiresAt: charge.expiresAt ? new Date(charge.expiresAt) : null,
    },
  });

  return NextResponse.json({
    paymentId: payment.id,
    brCode: charge.brCode,
    brCodeBase64: charge.brCodeBase64,
    quantity,
    ticketPrice,          // preço unitário
    subtotal: Math.round(ticketPrice * quantity * 100) / 100,
    fee,
    total,
    passFeeToBuyer: ticket.passFeeToBuyer,
    expiresAt: charge.expiresAt,
  }, { status: 201 });
}
