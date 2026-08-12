/**
 * Pedido de recuperação de senha.
 *
 * RESPONDE SEMPRE A MESMA COISA, exista ou não a conta. Se a tela dissesse
 * "e-mail não encontrado", a página viraria ferramenta para descobrir quem é
 * cliente, o mesmo problema que fechamos no cadastro.
 *
 * Funciona também para quem entrou só pelo Google e nunca teve senha: ao
 * concluir, ele passa a ter os dois caminhos de entrada.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkResetThrottle, recordReset, getClientIp } from "@/lib/loginThrottle";
import { criarTokenReset, enviarReset } from "@/lib/resetPassword";

export async function POST(req: Request) {
  const ok = NextResponse.json({ ok: true });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  if (!email) return ok;

  const ip = getClientIp(req);
  // Limite por IP para ninguém encher a caixa de um cliente com pedidos.
  // Bloqueado também responde igual, para não entregar o estado do limite.
  if ((await checkResetThrottle(ip)).blocked) return ok;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return ok; // silêncio proposital

    await recordReset(ip); // só conta pedido que realmente disparou e-mail
    const token = await criarTokenReset(email);
    await enviarReset(req, email, user.name ?? "", token);
  } catch (e) {
    console.error("[forgot-password] falhou:", e);
  }
  return ok;
}
