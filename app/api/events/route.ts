/**
 * Eventos do cliente logado.
 *  GET  → lista os eventos do tenant
 *  POST → cria um evento (com gating de plano: máx. eventos/mês)
 * Tudo isolado por tenantId — um cliente nunca vê/mexe nos eventos de outro.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { inputToDate, serializeEvent } from "@/lib/eventMap";

const EVENT_INCLUDE = {
  tickets: true,
  _count: { select: { confirmations: true, checkins: true } },
} as const;

export async function GET() {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { tenantId },
    include: EVENT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(events.map(serializeEvent));
}

export async function POST(req: Request) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

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
      visibility: body.visibility === "publico" ? "PUBLICO" : "RESTRITO",
      registrationOpensAt: body.registrationOpensAt ? inputToDate(body.registrationOpensAt) : null,
      registrationClosesAt: body.registrationClosesAt ? inputToDate(body.registrationClosesAt) : null,
      tickets: {
        create: tickets.map((t: { name?: string; price?: number; quantity?: number; passFeeToBuyer?: boolean }) => ({
          name: String(t.name || "Ingresso"),
          price: Number(t.price) || 0,
          quantity: Number(t.quantity) || 0,
          passFeeToBuyer: t.passFeeToBuyer !== false, // padrão: repassa ao comprador
        })),
      },
    },
    include: EVENT_INCLUDE,
  });

  return NextResponse.json(serializeEvent(event), { status: 201 });
}
