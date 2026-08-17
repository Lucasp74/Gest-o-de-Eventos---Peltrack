/**
 * Financeiro do cliente logado (tela /dashboard/financeiro).
 *  GET /api/finance?eventId=&days=  → números, séries e conversão do Pix.
 *
 * Sem eventId devolve o consolidado do cliente; com eventId, só daquele evento.
 * O formato da resposta é o mesmo nos dois casos, então a tela é uma só.
 *
 * A conta em si mora em lib/finance.ts (lógica pura, conferida por
 * lib/finance.check.ts). Aqui fica só o acesso: sessão, escopo e consulta.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/tenant";
import { agregar } from "@/lib/finance";

/** Períodos aceitos, em dias. 0 = desde sempre. */
const PERIODOS = [7, 30, 90];

export async function GET(req: NextRequest) {
  const acesso = await exigirDono();
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status });
  const tenantId = acesso.tenantId;

  const sp = req.nextUrl.searchParams;
  const eventId = sp.get("eventId")?.trim() || null;
  const pedido = Number(sp.get("days"));
  const days = PERIODOS.includes(pedido) ? pedido : 0;

  // O eventId vem do navegador: confirma que o evento é DESTE cliente antes de
  // responder. Sem esta checagem, um id adivinhado exporia o faturamento alheio.
  if (eventId) {
    const doCliente = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true },
    });
    if (!doCliente) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
  }

  const desde = days > 0 ? new Date(Date.now() - days * 86_400_000) : null;

  // Janela pelo createdAt (quando a cobrança foi gerada), para os dois gráficos
  // olharem o mesmo conjunto. O Pix expira em poucas horas, então na prática
  // createdAt e paidAt caem no mesmo dia.
  // ponytail: agrega em JS. São poucas centenas de linhas por cliente e o
  // groupBy do Prisma não agrupa por dia sem SQL cru. Vira date_trunc quando o
  // volume pedir.
  const pagamentos = await prisma.payment.findMany({
    where: {
      event: { tenantId },
      ...(eventId ? { eventId } : {}),
      ...(desde ? { createdAt: { gte: desde } } : {}),
    },
    select: {
      quantity: true,
      amount: true,
      feeAmount: true,
      status: true,
      createdAt: true,
      paidAt: true,
      event: { select: { id: true, name: true } },
      ticketType: { select: { name: true, sortOrder: true } },
    },
  });

  return NextResponse.json({
    escopo: eventId ? "evento" : "todos",
    dias: days,
    ...agregar(pagamentos),
  });
}
