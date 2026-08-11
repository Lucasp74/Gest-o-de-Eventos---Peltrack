/**
 * Cadastro de cliente (e-mail/senha). Cria o User com senha em hash + o Tenant
 * (organização) automaticamente e envia o e-mail de confirmação.
 *
 * NÃO loga a pessoa: o login só é liberado depois de confirmar o e-mail.
 *
 * RESPOSTA NEUTRA (anti-enumeração): e-mail novo e e-mail já cadastrado
 * devolvem exatamente a mesma coisa. Quem já tem conta recebe um e-mail de
 * "você já tem uma conta" em vez de ver o erro na tela — assim ninguém
 * consegue varrer a base descobrindo quem é cliente.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { MIN_PASSWORD } from "@/lib/password";
import { checkRegisterThrottle, recordRegister, getClientIp } from "@/lib/loginThrottle";
import { criarTokenConfirmacao, enviarConfirmacao, enviarContaJaExiste } from "@/lib/verifyEmail";

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

    // Conta o gasto ANTES de ramificar: as duas saídas disparam e-mail, então
    // as duas precisam pesar no limite. Senão dá para bombardear a caixa de
    // alguém repetindo o cadastro com o e-mail dele.
    await recordRegister(ip);

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (existing) {
      // Mesma resposta da tela de sucesso — o aviso vai só para o dono do e-mail.
      await enviarContaJaExiste(req, cleanEmail);
    } else {
      const passwordHash = bcrypt.hashSync(pass, 12);
      const tenant = await prisma.tenant.create({
        data: { name: cleanName, plan: "STARTER" },
      });
      await prisma.user.create({
        data: { name: cleanName, email: cleanEmail, passwordHash, tenantId: tenant.id },
      });

      const token = await criarTokenConfirmacao(cleanEmail);
      await enviarConfirmacao(req, cleanEmail, cleanName, token);
    }

    return NextResponse.json({ ok: true, confirmacaoEnviada: true });
  } catch {
    return NextResponse.json({ error: "Erro ao criar a conta." }, { status: 500 });
  }
}
