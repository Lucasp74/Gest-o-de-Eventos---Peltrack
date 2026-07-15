/**
 * Cadastro de cliente (e-mail/senha). Cria o User com senha em hash + o Tenant
 * (organização) automaticamente. O login é feito no cliente após o sucesso.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    const cleanName = String(name ?? "").trim();
    const cleanEmail = String(email ?? "").toLowerCase().trim();
    const pass = String(password ?? "");

    // Validação
    if (!cleanName) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    if (pass.length < 6)
      return NextResponse.json({ error: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });

    // E-mail já cadastrado?
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing)
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });

    // Cria o Tenant (organização) + o User vinculado
    const passwordHash = bcrypt.hashSync(pass, 10);
    const tenant = await prisma.tenant.create({
      data: { name: cleanName, plan: "STARTER" },
    });
    await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        tenantId: tenant.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao criar a conta." }, { status: 500 });
  }
}
