/**
 * Eventos do cliente logado.
 *  GET  → lista os eventos do tenant
 *  POST → cria um evento (com gating de plano: máx. eventos/mês)
 * Tudo isolado por tenantId — um cliente nunca vê/mexe nos eventos de outro.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, exigirDono, filtroDeEventos } from "@/lib/tenant";
import { inputToDate, serializeEvent } from "@/lib/eventMap";
import { enviarEscala } from "@/lib/staffEmail";

const EVENT_INCLUDE = {
  tickets: { orderBy: { sortOrder: "asc" } },
  _count: { select: { confirmations: true, checkins: true } },
} as const;

export async function GET() {
  const vinculo = await getCurrentMembership();
  if (!vinculo) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // O operador só vê os eventos em que foi escalado. Como o app desktop monta a
  // lista por esta mesma rota, o filtro chega lá sem precisar de release novo.
  const events = await prisma.event.findMany({
    where: filtroDeEventos(vinculo),
    include: EVENT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events.map(serializeEvent));
}

export async function POST(req: Request) {
  // Criar evento é do dono. O operador LÊ a lista (GET acima), porque precisa
  // dela para operar a portaria, mas não cria nem altera.
  const acesso = await exigirDono();
  if (!acesso.ok) return NextResponse.json({ error: acesso.erro }, { status: acesso.status });
  const tenantId = acesso.tenantId;

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  // Gating de plano — 0 = ilimitado. Conta os eventos criados no mês corrente.
  if (tenant.maxEventsPerMonth > 0) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const count = await prisma.event.count({
      where: { tenantId, createdAt: { gte: monthStart } },
    });
    if (count >= tenant.maxEventsPerMonth) {
      return NextResponse.json(
        {
          error: `Seu plano permite ${tenant.maxEventsPerMonth} evento(s) por mês. Faça upgrade para criar mais.`,
          code: "PLAN_LIMIT",
        },
        { status: 403 },
      );
    }
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name || !body.startAt) {
    return NextResponse.json({ error: "Nome e data de início são obrigatórios." }, { status: 400 });
  }

  const paid = body.paid === true;
  const tickets = paid && Array.isArray(body.tickets) ? body.tickets : [];
  const capacity = paid
    ? tickets.reduce((sum: number, t: { quantity?: number }) => sum + (Number(t.quantity) || 0), 0)
    : 0;

  const event = await prisma.event.create({
    data: {
      tenantId,
      name,
      description: body.description || null,
      imageUrl: body.imageUrl || null,
      subject: body.subject || null,
      category: body.category || null,
      startAt: inputToDate(body.startAt),
      endAt: body.endAt ? inputToDate(body.endAt) : null,
      venue: body.venue || null,
      street: body.street || null,
      number: body.number || null,
      complement: body.complement || null,
      district: body.district || null,
      city: body.city || null,
      uf: body.uf || null,
      cep: body.cep || null,
      capacity,
      status: "INSCRICOES",
      paid,
      batchMode: paid && body.batchMode === true, // lotes só existem em evento pago
      visibility: body.visibility === "publico" ? "PUBLICO" : "RESTRITO",
      registrationOpensAt: body.registrationOpensAt ? inputToDate(body.registrationOpensAt) : null,
      registrationClosesAt: body.registrationClosesAt ? inputToDate(body.registrationClosesAt) : null,
      tickets: {
        create: tickets.map((t: { name?: string; price?: number; quantity?: number; passFeeToBuyer?: boolean; minPerOrder?: number; maxPerOrder?: number; closesAt?: string }, i: number) => ({
          name: String(t.name || "Ingresso"),
          price: Number(t.price) || 0,
          quantity: Number(t.quantity) || 0,
          passFeeToBuyer: t.passFeeToBuyer !== false, // padrão: repassa ao comprador
          minPerOrder: Math.max(1, Math.floor(Number(t.minPerOrder) || 1)),
          maxPerOrder: Math.max(0, Math.floor(Number(t.maxPerOrder) || 0)), // 0 = sem limite
          // A ordem do formulário É a ordem dos lotes (1º, 2º, 3º...).
          sortOrder: i,
          closesAt: t.closesAt ? inputToDate(t.closesAt) : null,
        })),
      },
    },
    include: EVENT_INCLUDE,
  });

  // Escala inicial, opcional. Mesma conferência da rota de escala: só entra
  // quem é OPERADOR DESTA organização, para um id solto no corpo não dar acesso
  // à lista de convidados a alguém de fora.
  const pedidos: string[] = Array.isArray(body.staffIds) ? body.staffIds.map(String) : [];
  if (pedidos.length > 0) {
    const validos = await prisma.user.findMany({
      where: { id: { in: pedidos }, tenantId, tenantRole: "OPERADOR" },
      select: { id: true, name: true, email: true },
    });
    if (validos.length > 0) {
      await prisma.eventStaff.createMany({
        data: validos.map((u) => ({ eventId: event.id, userId: u.id })),
      });
      for (const u of validos) {
        await enviarEscala(req, { para: u.email, nome: u.name, evento: event }).catch(() => {});
      }
    }
  }

  return NextResponse.json(serializeEvent(event), { status: 201 });
}
