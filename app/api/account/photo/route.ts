/**
 * Salva a foto de perfil do usuário logado (URL já hospedada no Vercel Blob via /api/upload).
 * Só grava a URL em user.image — a imagem em si já foi redimensionada no cliente.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { url } = await req.json().catch(() => ({}));
  if (typeof url !== "string" || !url.startsWith("http")) {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { image: url } });
  return NextResponse.json({ ok: true });
}
