/**
 * Confirmação de presença PÚBLICA (o convidado, sem login).
 * O servidor decide confirmado × lista de espera (pela capacidade), impede
 * e-mail duplicado e respeita a janela de inscrições. Gera o token do QR e
 * envia o convite por e-mail (QR gerado no servidor).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeConfirmation } from "@/lib/presenceMap";
import { sendInviteEmail } from "@/lib/inviteEmail";
import { notifyEvent } from "@/lib/pusherServer";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!name || !emailOk(email)) {
    return NextResponse.json({ error: "Nome e e-mail válidos são obrigatórios." }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  // Janela de inscrições (se definida)
  const now = new Date();
  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    return NextResponse.json({ error: "As inscrições ainda não abriram.", code: "NOT_OPEN" }, { status: 400 });
  }
  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    return NextResponse.json({ error: "As inscrições foram encerradas.", code: "CLOSED" }, { status: 400 });
  }

  // E-mail já confirmado neste evento (RSVP gratuito)? Dedup no código, já que
  // não há mais índice único por (evento, e-mail). Escopo: confirmações sem
  // pagamento (as pagas podem repetir o e-mail, um QR por ingresso).
  const existing = await prisma.confirmation.findFirst({
    where: { eventId: id, email, paymentId: null },
  });
  if (existing && existing.status !== "CANCELADO") {
    return NextResponse.json(
      { error: "Este e-mail já confirmou presença neste evento.", code: "ALREADY" },
      { status: 409 },
    );
  }

  // Capacidade → lista de espera quando lotado (0 = ilimitado)
  const confirmedCount = await prisma.confirmation.count({
    where: { eventId: id, status: "CONFIRMADO" },
  });
  const isFull = event.capacity > 0 && confirmedCount >= event.capacity;
  const status = isFull ? "LISTA_ESPERA" : "CONFIRMADO";

  try {
    // Se havia um cancelado com o mesmo e-mail, reaproveita; senão, cria.
    const confirmation = existing
      ? await prisma.confirmation.update({ where: { id: existing.id }, data: { name, status } })
      : await prisma.confirmation.create({ data: { eventId: id, name, email, status } });

    // Envia o convite por e-mail (QR gerado no servidor). Não bloqueia a resposta
    // se o e-mail falhar — a confirmação já está salva e o QR aparece na tela.
    const emailRes = await sendInviteEmail({
      to: email,
      name,
      token: confirmation.id,
      event, // objeto completo do evento (inclui endereço)
      waitlist: status === "LISTA_ESPERA",
      idempotencyKey: `invite/${confirmation.id}`,
    }).catch((e) => ({ ok: false, error: String(e) }));
    if (!emailRes.ok) console.error("[confirm] Falha ao enviar convite:", emailRes.error);

    await notifyEvent(id, "confirmation"); // avisa o painel ao vivo
    return NextResponse.json(serializeConfirmation(confirmation), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar. Tente novamente." }, { status: 500 });
  }
}
