/**
 * Um evento específico do cliente logado.
 *  GET    → detalhes
 *  PATCH  → editar (nome, data, local, capacidade, status, janela de inscrições)
 *  DELETE → excluir
 * Todas as operações são amarradas ao tenantId — o cliente só acessa o que é dele.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { inputToDate, statusToDb, serializeEvent } from "@/lib/eventMap";

const EVENT_INCLUDE = {
  tickets: true,
  _count: { select: { confirmations: true, checkins: true } },
} as const;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, tenantId },
    include: EVENT_INCLUDE,
  });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  return NextResponse.json(serializeEvent(event));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const owned = await prisma.event.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if ("imageUrl" in body) data.imageUrl = body.imageUrl || null;
  if (body.startAt) data.startAt = inputToDate(body.startAt);
  if (typeof body.local === "string") data.venue = body.local.trim() || null;
  if (Number.isInteger(body.capacity)) data.capacity = body.capacity;
  if (typeof body.status === "string") data.status = statusToDb(body.status);
  if (body.visibility === "publico" || body.visibility === "restrito")
    data.visibility = body.visibility === "publico" ? "PUBLICO" : "RESTRITO";
  // Janela de inscrições: pode ser definida (string) ou removida (null)
  if ("registrationOpensAt" in body)
    data.registrationOpensAt = body.registrationOpensAt ? inputToDate(body.registrationOpensAt) : null;
  if ("registrationClosesAt" in body)
    data.registrationClosesAt = body.registrationClosesAt ? inputToDate(body.registrationClosesAt) : null;

  const event = await prisma.event.update({
    where: { id },
    data,
    include: EVENT_INCLUDE,
  });
  return NextResponse.json(serializeEvent(event));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const result = await prisma.event.deleteMany({ where: { id, tenantId } });
  if (result.count === 0) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
