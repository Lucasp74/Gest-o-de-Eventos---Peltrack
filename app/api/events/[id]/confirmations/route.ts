/**
 * Convidados de um evento (aba Convidados).
 *  GET  → lista as confirmações
 *  POST → adiciona um convidado manualmente (status confirmado)
 * Restrito ao dono do evento (tenant).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { serializeConfirmation } from "@/lib/presenceMap";

async function ownedEvent(id: string) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { status: 401 as const };
  const event = await prisma.event.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!event) return { status: 404 as const };
  return { status: 200 as const };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await ownedEvent(id);
  if (guard.status !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: guard.status });

  const confirmations = await prisma.confirmation.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(confirmations.map(serializeConfirmation));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await ownedEvent(id);
  if (guard.status !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: guard.status });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!name || !email) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
  }

  // Dedup no código (não há mais índice único por evento/e-mail). Escopo: convidados
  // manuais (sem pagamento) — ingressos pagos podem repetir o e-mail.
  const existing = await prisma.confirmation.findFirst({
    where: { eventId: id, email, paymentId: null },
  });
  if (existing && existing.status !== "CANCELADO") {
    return NextResponse.json({ error: "Este e-mail já está na lista.", code: "ALREADY" }, { status: 409 });
  }

  const confirmation = existing
    ? await prisma.confirmation.update({ where: { id: existing.id }, data: { name, status: "CONFIRMADO" } })
    : await prisma.confirmation.create({ data: { eventId: id, name, email, status: "CONFIRMADO" } });
  return NextResponse.json(serializeConfirmation(confirmation), { status: 201 });
}
