/**
 * Reenvia o e-mail de confirmação.
 * Sempre responde OK, mesmo para e-mail inexistente ou já confirmado — senão
 * viraria uma forma de descobrir quem tem conta. Espera de 60s entre envios,
 * mesmo padrão do código de acesso do admin, para não virar mail-bomb.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarTokenConfirmacao, enviarConfirmacao } from "@/lib/verifyEmail";

const ESPERA_S = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const ok = NextResponse.json({ ok: true });
  if (!email) return ok;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) return ok; // nada a fazer — resposta idêntica

    // Cooldown: o token anterior guarda a hora de criação na própria validade.
    const anterior = await prisma.verificationToken.findFirst({ where: { identifier: email } });
    if (anterior) {
      const criadoEm = anterior.expires.getTime() - 24 * 3_600_000;
      if (Date.now() - criadoEm < ESPERA_S * 1000) return ok;
    }

    const token = await criarTokenConfirmacao(email);
    await enviarConfirmacao(req, email, user.name ?? "", token);
  } catch (e) {
    console.error("[resend-confirmation] falhou:", e);
  }
  return ok;
}
