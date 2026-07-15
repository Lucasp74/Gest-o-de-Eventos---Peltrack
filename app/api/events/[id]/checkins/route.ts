/**
 * Check-ins de um evento (Scanner).
 *  GET    → lista os check-ins
 *  POST   → registra um check-in a partir do token do QR (validação anti-fraude)
 *  DELETE → desfaz um check-in (?token=...)
 * Restrito ao dono do evento.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";
import { serializeCheckin } from "@/lib/presenceMap";
import { notifyEvent } from "@/lib/pusherServer";

async function ownedEvent(id: string) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return 401 as const;
  const event = await prisma.event.findFirst({ where: { id, tenantId }, select: { id: true } });
  return event ? (200 as const) : (404 as const);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await ownedEvent(id);
  if (s !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: s });

  const checkins = await prisma.checkin.findMany({
    where: { eventId: id },
    orderBy: { checkedInAt: "desc" },
  });
  return NextResponse.json(checkins.map(serializeCheckin));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await ownedEvent(id);
  if (s !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: s });

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "").trim();
  const terminal = String(body.terminal ?? "Manual").trim() || "Manual";
  if (!token) return NextResponse.json({ result: "not_found" });

  // O token do QR é o id da confirmação. Precisa existir, ser deste evento e não estar cancelada.
  const confirmation = await prisma.confirmation.findFirst({
    where: { id: token, eventId: id },
  });
  if (!confirmation || confirmation.status === "CANCELADO") {
    return NextResponse.json({ result: "not_found" });
  }

  // Já usado?
  const existing = await prisma.checkin.findUnique({ where: { confirmationId: token } });
  if (existing) {
    return NextResponse.json({
      result: "duplicate",
      name: confirmation.name,
      usedAt: existing.checkedInAt.toISOString(),
      terminal: existing.terminal,
    });
  }

  const checkin = await prisma.checkin.create({
    data: {
      eventId: id,
      confirmationId: token,
      name: confirmation.name,
      email: confirmation.email,
      terminal,
    },
  });
  await notifyEvent(id, "checkin"); // atualiza os guichês ao vivo
  return NextResponse.json({ result: "success", name: confirmation.name, checkin: serializeCheckin(checkin) });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await ownedEvent(id);
  if (s !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: s });

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token ausente." }, { status: 400 });

  await prisma.checkin.deleteMany({ where: { eventId: id, confirmationId: token } });
  await notifyEvent(id, "checkin-undo");
  return NextResponse.json({ ok: true });
}
