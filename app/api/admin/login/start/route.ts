/**
 * 1ª etapa do login admin: captcha + e-mail/senha.
 * Se tudo estiver certo, gera um código de 6 dígitos (uso único,
 * expira em 10 min) e envia por e-mail — a 2ª etapa valida o código.
 * Sem RESEND_API_KEY (dev), o código sai no log do servidor.
 */
import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/lib/turnstile";
import { brandedEmail, emailSubject } from "@/lib/emailLayout";
import { checkLoginThrottle, recordLoginFailure, resetLoginThrottle, getClientIp } from "@/lib/loginThrottle";

const OTP_TTL_MIN = 10;
const RESEND_COOLDOWN_S = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  const turnstileToken = String(body.turnstileToken ?? "");

  // 1) Captcha — barra robôs antes de qualquer consulta
  const human = await verifyTurnstile(turnstileToken);
  if (!human) {
    return NextResponse.json({ error: "Verificação anti-robô falhou. Recarregue a página." }, { status: 400 });
  }

  // 2) Rate limit (após 5 falhas do mesmo par e-mail+IP) + e-mail + senha
  const ip = getClientIp(req);
  const gate = await checkLoginThrottle(email, ip);
  if (gate.blocked) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${gate.retryAfterMin} min.` },
      { status: 429 },
    );
  }
  const admin = email ? await prisma.admin.findUnique({ where: { email } }) : null;
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash)) {
    await recordLoginFailure(email, ip);
    return NextResponse.json({ error: "Credenciais de administrador inválidas." }, { status: 401 });
  }
  await resetLoginThrottle(email, ip);

  // 3) Cooldown — evita spam de códigos
  const last = await prisma.adminOtp.findFirst({
    where: { adminId: admin.id },
    orderBy: { createdAt: "desc" },
  });
  if (last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_S * 1000) {
    return NextResponse.json({ error: "Aguarde um instante antes de pedir um novo código." }, { status: 429 });
  }

  // 4) Gera o código (invalidando os anteriores) e guarda só o hash
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.adminOtp.deleteMany({ where: { adminId: admin.id } });
  const otp = await prisma.adminOtp.create({
    data: {
      adminId: admin.id,
      codeHash: bcrypt.hashSync(code, 12),
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
    },
  });

  // 5) Envia por e-mail (ou loga no dev, sem chave do Resend)
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send(
      {
        from: process.env.MAIL_FROM || "Peltrack <onboarding@resend.dev>",
        to: [admin.email],
        subject: emailSubject("Código de Acesso"),
        html: brandedEmail(`
          <p style="margin-top:0"><strong>Painel administrativo</strong></p>
          <p>Use o código abaixo para entrar:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#F8F8F8;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${code}</p>
          <p style="color:#666;font-size:13px;margin-bottom:0">O código expira em ${OTP_TTL_MIN} minutos e só funciona uma vez.<br/>Se você não tentou entrar, troque sua senha imediatamente.</p>
        `),
      },
      { idempotencyKey: `admin-otp/${otp.id}` },
    );
    if (error) {
      console.error("[admin-login] Falha ao enviar e-mail:", error.message);
      return NextResponse.json({ error: "Não foi possível enviar o código. Tente novamente." }, { status: 502 });
    }
  } else {
    console.log(`[admin-login][DEV] Código de acesso para ${admin.email}: ${code}`);
  }

  return NextResponse.json({ ok: true, ttlMin: OTP_TTL_MIN });
}
