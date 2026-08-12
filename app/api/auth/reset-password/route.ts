/**
 * Troca a senha usando o token recebido por e-mail.
 * O token é de uso único e vale 30 minutos.
 *
 * Também CONFIRMA o e-mail, se ainda estiver pendente: a pessoa clicou em um
 * link que só chegou naquela caixa, então a posse está provada. Sem isso ela
 * trocaria a senha e continuaria sem conseguir entrar, o que seria absurdo.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD } from "@/lib/password";
import { consumirTokenReset } from "@/lib/resetPassword";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const senha = String(body.password ?? "");

  if (senha.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `A senha deve ter ao menos ${MIN_PASSWORD} caracteres.` },
      { status: 400 },
    );
  }

  // Valida a senha ANTES de consumir o token: senão um erro de digitação
  // queimaria o link e a pessoa teria que pedir tudo de novo.
  const email = await consumirTokenReset(token);
  if (!email) {
    return NextResponse.json(
      { error: "Este link expirou ou já foi usado. Peça um novo.", code: "TOKEN_INVALIDO" },
      { status: 400 },
    );
  }

  const atualizados = await prisma.user.updateMany({
    where: { email },
    data: { passwordHash: bcrypt.hashSync(senha, 12), emailVerified: new Date() },
  });
  if (atualizados.count === 0) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
