/**
 * Login do app DESKTOP. Usa a MESMA credencial do web (e-mail + senha), mas
 * devolve um TOKEN em vez de cookie de sessão — app nativo não lida bem com
 * cookie. O token vai no header Authorization: Bearer nas demais chamadas.
 *
 * Gating: só organizações com flagDesktopSync (Pro/Enterprise) podem entrar.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signDesktopToken } from "@/lib/desktopToken";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenant: { select: { id: true, name: true, plan: true, flagDesktopSync: true } } },
  });

  // Mensagem genérica de propósito: não revela se o e-mail existe.
  if (!user?.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return NextResponse.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
  }

  if (!user.tenant) {
    return NextResponse.json({ error: "Conta sem organização vinculada." }, { status: 403 });
  }

  if (!user.tenant.flagDesktopSync) {
    return NextResponse.json(
      { error: "O app desktop está disponível nos planos Pro e Enterprise.", code: "PLANO" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    token: signDesktopToken(user.id),
    usuario: { nome: user.name, email: user.email },
    organizacao: {
      id: user.tenant.id,
      nome: user.tenant.name,
      plano: user.tenant.plan,
    },
  });
}
