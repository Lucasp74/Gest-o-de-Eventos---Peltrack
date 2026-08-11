/**
 * Por que o login falhou — para a tela mostrar a mensagem certa.
 * O Auth.js devolve erro genérico; este endpoint traduz.
 *
 * ⚠️ SÓ revela "e-mail não confirmado" quando E-MAIL E SENHA ESTÃO CORRETOS.
 * Sem essa condição, viraria uma forma de descobrir quem tem conta aqui
 * (enumeração). Quem já acertou a senha não está descobrindo nada novo.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkLoginThrottle, getClientIp } from "@/lib/loginThrottle";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  // Bloqueio por tentativas tem prioridade — é o que a pessoa precisa saber.
  const gate = await checkLoginThrottle(email, getClientIp(req));
  if (gate.blocked) {
    return NextResponse.json({ blocked: true, retryAfterMin: gate.retryAfterMin });
  }

  if (email && password) {
    const user = await prisma.user.findUnique({ where: { email } });
    const senhaOk = !!user?.passwordHash && bcrypt.compareSync(password, user.passwordHash);
    if (senhaOk && !user!.emailVerified) {
      return NextResponse.json({ unverified: true });
    }
  }

  return NextResponse.json({}); // credencial errada — mensagem genérica na tela
}
