/**
 * Cadastro de cliente (e-mail/senha). Cria o User com senha em hash + o Tenant
 * (organização) automaticamente. O login é feito no cliente após o sucesso.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD } from "@/lib/password";
import { checkRegisterThrottle, recordRegister, getClientIp } from "@/lib/loginThrottle";

export async function POST(req: Request) {
  try {
    // Anti-bot: mais de 5 contas na última hora do mesmo IP → barra por 1h.
    // Conta em massa = e-mail de confirmação em massa = reputação do domínio no lixo.
    const ip = getClientIp(req);
    const gate = await checkRegisterThrottle(ip);
    if (gate.blocked) {
      return NextResponse.json(
        { error: "Muitas contas criadas a partir desta conexão. Tente novamente mais tarde." },
        { status: 429 },
      );
    }

    const { name, email, password } = await req.json();

    const cleanName = String(name ?? "").trim();
    const cleanEmail = String(email ?? "").toLowerCase().trim();
    const pass = String(password ?? "");

    // Validação
    if (!cleanName) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
    if (pass.length < MIN_PASSWORD)
      return NextResponse.json({ error: `A senha deve ter ao menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });

    // E-mail já cadastrado?
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing)
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });

    // Cria o Tenant (organização) + o User vinculado
    const passwordHash = bcrypt.hashSync(pass, 12);
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

    await recordRegister(ip); // só cadastro EFETIVADO conta pro limite
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao criar a conta." }, { status: 500 });
  }
}
