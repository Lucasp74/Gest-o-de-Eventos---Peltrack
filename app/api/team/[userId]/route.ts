/**
 * Um membro da equipe.
 *  PATCH  → troca o papel (dono <-> operador)
 *  DELETE → remove da organização
 *
 * Restrito ao DONO, e com duas travas que impedem a organização de virar um
 * carro sem motorista.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOwnerTenantId } from "@/lib/tenant";

const negado = () =>
  NextResponse.json({ error: "Ação restrita ao dono da organização." }, { status: 403 });

/** Membro alvo, desde que seja da MESMA organização de quem está pedindo. */
async function alvoDaOrganizacao(userId: string, tenantId: string) {
  return prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: { id: true, name: true, email: true, tenantRole: true },
  });
}

/** Sobraria algum dono na organização depois desta mudança? */
async function restariaDono(tenantId: string, userIdSaindo: string) {
  const outros = await prisma.user.count({
    where: { tenantId, tenantRole: "DONO", id: { not: userIdSaindo } },
  });
  return outros > 0;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const tenantId = await getOwnerTenantId();
  if (!tenantId) return negado();

  const { userId } = await params;
  const alvo = await alvoDaOrganizacao(userId, tenantId);
  if (!alvo) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const papel = String(body.papel ?? "");
  if (papel !== "DONO" && papel !== "OPERADOR") {
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
  }

  // Rebaixar o ÚLTIMO dono deixaria a organização sem ninguém capaz de gerenciar
  // cobrança, Mercado Pago ou a própria equipe, e sem caminho de volta.
  if (papel === "OPERADOR" && !(await restariaDono(tenantId, alvo.id))) {
    return NextResponse.json(
      { error: "A organização precisa de pelo menos um dono. Promova outra pessoa antes." },
      { status: 409 },
    );
  }

  await prisma.user.update({ where: { id: alvo.id }, data: { tenantRole: papel } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const tenantId = await getOwnerTenantId();
  if (!tenantId) return negado();

  const { userId } = await params;
  const alvo = await alvoDaOrganizacao(userId, tenantId);
  if (!alvo) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 });

  const session = await auth();
  if (session?.user?.id === alvo.id) {
    return NextResponse.json({ error: "Você não pode remover a si mesmo." }, { status: 409 });
  }
  if (alvo.tenantRole === "DONO" && !(await restariaDono(tenantId, alvo.id))) {
    return NextResponse.json(
      { error: "A organização precisa de pelo menos um dono." },
      { status: 409 },
    );
  }

  // A pessoa removida GANHA UMA ORGANIZAÇÃO PRÓPRIA E VAZIA (decisão do Lucas em
  // 16/08), voltando ao estado de quem acabou de se cadastrar. Sem isso ela
  // ficaria com uma conta sem organização, travada numa tela sem saída e sem
  // conseguir resolver sozinha.
  const nova = await prisma.tenant.create({
    data: { name: alvo.name ?? "Minha organização", plan: "STARTER" },
  });
  await prisma.user.update({
    where: { id: alvo.id },
    data: { tenantId: nova.id, tenantRole: "DONO" },
  });

  return NextResponse.json({ ok: true });
}
