/**
 * Escala do evento: quem da equipe trabalha nele.
 *  GET → operadores da organização + quem já está escalado
 *  PUT → substitui a escala inteira pela lista recebida
 *
 * Só o DONO mexe. O dono não precisa se escalar: ele já enxerga tudo.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOwnerTenantId } from "@/lib/tenant";
import { enviarEscala } from "@/lib/staffEmail";

const negado = () =>
  NextResponse.json({ error: "Ação restrita ao dono da organização." }, { status: 403 });

async function eventoDoDono(id: string, tenantId: string) {
  return prisma.event.findFirst({
    where: { id, tenantId },
    select: { id: true, name: true, startAt: true, venue: true, city: true },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getOwnerTenantId();
  if (!tenantId) return negado();

  const { id } = await params;
  const evento = await eventoDoDono(id, tenantId);
  if (!evento) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  const [operadores, escalados] = await Promise.all([
    // Só operadores: escalar um dono não mudaria nada, ele já vê tudo.
    prisma.user.findMany({
      where: { tenantId, tenantRole: "OPERADOR" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.eventStaff.findMany({ where: { eventId: id }, select: { userId: true } }),
  ]);

  return NextResponse.json({
    operadores,
    escalados: escalados.map((e) => e.userId),
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getOwnerTenantId();
  if (!tenantId) return negado();

  const { id } = await params;
  const evento = await eventoDoDono(id, tenantId);
  if (!evento) return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const pedidos: string[] = Array.isArray(body.userIds) ? body.userIds.map(String) : [];

  // Só aceita quem é OPERADOR DESTA organização. Sem esta conferência, um id
  // solto no corpo da requisição escalaria alguém de fora e daria a essa pessoa
  // acesso à lista de convidados do evento.
  const validos = await prisma.user.findMany({
    where: { id: { in: pedidos }, tenantId, tenantRole: "OPERADOR" },
    select: { id: true, name: true, email: true },
  });

  const jaEscalados = await prisma.eventStaff.findMany({
    where: { eventId: id },
    select: { userId: true },
  });
  const antes = new Set(jaEscalados.map((e) => e.userId));

  await prisma.$transaction([
    prisma.eventStaff.deleteMany({ where: { eventId: id } }),
    prisma.eventStaff.createMany({
      data: validos.map((u) => ({ eventId: id, userId: u.id })),
    }),
  ]);

  // Avisa só quem ENTROU agora. Quem já estava não recebe de novo a cada
  // ajuste da escala, senão o aviso vira ruído e some da caixa de entrada.
  const novos = validos.filter((u) => !antes.has(u.id));
  for (const u of novos) {
    await enviarEscala(req, { para: u.email, nome: u.name, evento }).catch(() => {});
  }

  return NextResponse.json({ ok: true, escalados: validos.length, avisados: novos.length });
}
