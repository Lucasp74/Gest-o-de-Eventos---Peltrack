/**
 * Equipe da organização.
 *  GET  → membros + convites pendentes
 *  POST → convida alguém por e-mail, com papel definido pelo dono
 *
 * Tudo restrito ao DONO. Equipe é recurso de Pro e Enterprise.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirDono } from "@/lib/tenant";
import { criarConvite, enviarConvite, convitesPendentes, type PapelConvite } from "@/lib/teamInvite";

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

/** Equipe é recurso de plano pago. Starter fica de fora. */
const planoPermiteEquipe = (plan: string) => plan === "PRO" || plan === "ENTERPRISE";

const negado = (a: { status: number; erro: string }) =>
  NextResponse.json({ error: a.erro }, { status: a.status });

export async function GET() {
  const acesso = await exigirDono();
  if (!acesso.ok) return negado(acesso);
  const tenantId = acesso.tenantId;

  const [tenant, membros, pendentes] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } }),
    prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, image: true, tenantRole: true, createdAt: true },
    }),
    convitesPendentes(tenantId),
  ]);

  return NextResponse.json({
    permitido: planoPermiteEquipe(tenant?.plan ?? "STARTER"),
    membros,
    pendentes: pendentes.map((p) => ({ email: p.email, papel: p.papel, expira: p.expira })),
  });
}

export async function POST(req: Request) {
  const acesso = await exigirDono();
  if (!acesso.ok) return negado(acesso);
  const tenantId = acesso.tenantId;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, plan: true },
  });
  if (!tenant) return NextResponse.json({ error: "Organização não encontrada." }, { status: 404 });

  // Gating por plano. Quem já tem operadores e caiu para Starter NÃO perde os
  // membros atuais (decisão do Lucas em 16/08): a trava é só em convidar mais,
  // porque cortar acesso no meio de um evento por causa de cobrança é o mesmo
  // problema que evitamos na suspensão.
  if (!planoPermiteEquipe(tenant.plan)) {
    return NextResponse.json(
      { error: "Equipes estão disponíveis nos planos Pro e Enterprise.", code: "PLANO" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const papel = String(body.papel ?? "OPERADOR") as PapelConvite;

  if (!emailOk(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (papel !== "DONO" && papel !== "OPERADOR") {
    return NextResponse.json({ error: "Papel inválido." }, { status: 400 });
  }

  // Quem JÁ TEM CONTA não pode ser convidado nesta versão. Um usuário pertence a
  // uma organização só, então aceitar moveria a pessoa para cá e deixaria a
  // organização dela órfã, exatamente o estrago que limpamos em 11/08.
  const jaExiste = await prisma.user.findUnique({ where: { email }, select: { tenantId: true } });
  if (jaExiste) {
    return NextResponse.json(
      {
        error:
          "Esse e-mail já tem conta no Peltrack. Nesta versão, cada pessoa pertence a uma organização, então peça que ela use outro e-mail.",
        code: "JA_TEM_CONTA",
      },
      { status: 409 },
    );
  }

  const session = await auth();
  const convidadoPor = session?.user?.name || session?.user?.email || "O dono da organização";

  const token = await criarConvite({ tenantId, papel, email });
  await enviarConvite(req, {
    email,
    papel,
    organizacao: tenant.name,
    convidadoPor,
    token,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
