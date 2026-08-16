/**
 * Aceite do convite de equipe: cria a conta JÁ DENTRO da organização.
 *
 * Rota pública de propósito: quem tem o token é quem recebeu o e-mail, e o
 * token é a prova. É o mesmo raciocínio do link de redefinir senha.
 *
 * NÃO passa pelo fluxo normal de cadastro porque aquele cria uma organização
 * nova para cada pessoa (ver events.createUser no auth.ts). Aqui a organização
 * já existe e vem amarrada dentro do token.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD } from "@/lib/password";
import { lerConvite, consumirConvite } from "@/lib/teamInvite";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const nome = String(body.nome ?? "").trim();
  const senha = String(body.senha ?? "");

  const convite = await lerConvite(token);
  if (!convite) {
    return NextResponse.json({ error: "Convite expirado ou inválido." }, { status: 400 });
  }
  if (!nome) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (senha.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `A senha deve ter ao menos ${MIN_PASSWORD} caracteres.` },
      { status: 400 },
    );
  }

  // Conferido de novo no aceite, não só no convite: entre um e outro a pessoa
  // pode ter criado conta por conta própria.
  const jaExiste = await prisma.user.findUnique({ where: { email: convite.email }, select: { id: true } });
  if (jaExiste) {
    return NextResponse.json(
      { error: "Esse e-mail já tem conta no Peltrack. Entre com ela.", code: "JA_TEM_CONTA" },
      { status: 409 },
    );
  }

  // A organização pode ter sido excluída depois do convite.
  const org = await prisma.tenant.findUnique({
    where: { id: convite.tenantId },
    select: { id: true, suspendedAt: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Esta organização não existe mais." }, { status: 404 });
  }
  if (org.suspendedAt) {
    return NextResponse.json({ error: "Esta organização está com o acesso suspenso." }, { status: 403 });
  }

  await prisma.user.create({
    data: {
      name: nome,
      email: convite.email,
      passwordHash: bcrypt.hashSync(senha, 12),
      tenantId: convite.tenantId,
      tenantRole: convite.papel,
      // Clicar no link provou a posse da caixa de entrada, então a conta já
      // nasce confirmada e a pessoa entra direto, sem um segundo e-mail.
      emailVerified: new Date(),
    },
  });

  await consumirConvite(token);
  return NextResponse.json({ ok: true, email: convite.email }, { status: 201 });
}
