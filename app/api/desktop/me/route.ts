/**
 * Perfil do usuário do app DESKTOP + revalidação do token, numa chamada só.
 * O app bate aqui ao abrir e a cada reconexão:
 *  · token morto  → 401, e o app desloga com aviso;
 *  · token vivo   → devolve o perfil ATUAL, então a foto trocada no site
 *                   aparece no app sem precisar de novo login.
 * Mesmo formato do /api/desktop/login (menos o token), pra sessão ser regravada
 * direto com o que volta daqui.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyDesktopToken } from "@/lib/desktopToken";

const naoAutenticado = () =>
  NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

export async function GET() {
  const authorization = (await headers()).get("authorization");
  if (!authorization?.startsWith("Bearer ")) return naoAutenticado();

  const payload = verifyDesktopToken(authorization.slice(7).trim());
  if (!payload) return naoAutenticado();

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { tenant: { select: { id: true, name: true, plan: true, flagDesktopSync: true } } },
  });
  if (!user?.tenant) return naoAutenticado();

  // O plano pode ter mudado desde o login — mesma regra da entrada.
  if (!user.tenant.flagDesktopSync) {
    return NextResponse.json(
      { error: "O app desktop está disponível nos planos Pro e Enterprise.", code: "PLANO" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    usuario: { nome: user.name, email: user.email, image: user.image },
    organizacao: { id: user.tenant.id, nome: user.tenant.name, plano: user.tenant.plan },
  });
}
