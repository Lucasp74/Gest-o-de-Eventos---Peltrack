/**
 * Define ou altera a senha do usuário logado.
 * - Usuário que entrou só pelo Google (sem senha) pode CRIAR uma senha.
 * - Usuário que já tem senha precisa informar a atual para TROCAR.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD } from "@/lib/password";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();
  const pass = String(newPassword ?? "");
  if (pass.length < MIN_PASSWORD) {
    return NextResponse.json({ error: `A nova senha deve ter ao menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  // Se já tem senha, exige a atual para trocar
  if (user.passwordHash) {
    const ok = bcrypt.compareSync(String(currentPassword ?? ""), user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(pass, 12) },
  });

  return NextResponse.json({ ok: true });
}
