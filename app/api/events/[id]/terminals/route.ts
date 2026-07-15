/**
 * Terminais/guichês de um evento.
 *  GET → nomes dos terminais (ou os padrões, se ainda não houver nenhum)
 *  PUT → substitui a lista inteira (o diálogo de gestão salva tudo de uma vez)
 * Restrito ao dono do evento.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentTenantId } from "@/lib/tenant";

// Local (não exportar de um route.ts — o Next 16 só permite handlers).
// A cópia compartilhada com o front vive em lib/eventData.ts.
const DEFAULT_TERMINALS = ["Guichê 1", "Guichê 2", "Guichê 3", "Guichê 4"];

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

  const terminals = await prisma.terminal.findMany({
    where: { eventId: id },
    orderBy: { name: "asc" },
  });
  const names = terminals.map((t) => t.name);
  return NextResponse.json(names.length > 0 ? names : DEFAULT_TERMINALS);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await ownedEvent(id);
  if (s !== 200) return NextResponse.json({ error: "Sem acesso." }, { status: s });

  const body = await req.json().catch(() => ({}));
  const rawNames: unknown = body.names;
  const names: string[] = Array.isArray(rawNames)
    ? [...new Set(rawNames.map((n) => String(n).trim()).filter(Boolean))]
    : [];
  if (names.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um terminal." }, { status: 400 });
  }

  // Substitui a lista inteira
  await prisma.$transaction([
    prisma.terminal.deleteMany({ where: { eventId: id } }),
    prisma.terminal.createMany({ data: names.map((name) => ({ eventId: id, name })) }),
  ]);

  return NextResponse.json(names);
}
