/**
 * Confirmação de e-mail no cadastro.
 *
 * Guardamos apenas o HASH do token (sha256, mesmo padrão do LoginThrottle):
 * se o banco vazar, ninguém consegue confirmar contas alheias com o que leu.
 * O token em claro só existe no link que vai por e-mail.
 *
 * Reusa a tabela VerificationToken, que já existe no schema (vem do adapter do
 * Auth.js) — zero migração. identifier = e-mail, token = hash, expires = 24h.
 */
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { brandedEmail, emailSubject, mailFromContato } from "@/lib/emailLayout";

const VALIDADE_HORAS = 24;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Cria (e invalida os anteriores) um token de confirmação. Devolve o token em claro. */
export async function criarTokenConfirmacao(email: string): Promise<string> {
  const identifier = email.toLowerCase().trim();
  const token = randomBytes(32).toString("base64url");

  // Um pedido novo invalida os antigos — link velho não deve continuar valendo.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + VALIDADE_HORAS * 3_600_000),
    },
  });
  return token;
}

/**
 * Valida o token e marca o e-mail como confirmado.
 * Uso único: o registro é apagado ao confirmar.
 */
export async function confirmarToken(token: string): Promise<{ ok: boolean; motivo?: "invalido" | "expirado" }> {
  const registro = await prisma.verificationToken.findFirst({
    where: { token: hashToken(token) },
  });
  if (!registro) return { ok: false, motivo: "invalido" };

  if (registro.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier: registro.identifier } });
    return { ok: false, motivo: "expirado" };
  }

  await prisma.user.updateMany({
    where: { email: registro.identifier },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.deleteMany({ where: { identifier: registro.identifier } });
  return { ok: true };
}

/** Monta a URL absoluta a partir da requisição — não há variável de URL do site no projeto. */
const linkDe = (req: Request, token: string) =>
  new URL(`/verificar?token=${encodeURIComponent(token)}`, req.url).toString();

const botao = (href: string, texto: string) => `
  <a href="${href}" style="display:inline-block;background:#1F8A7A;color:#fff;text-decoration:none;
     font-weight:bold;padding:14px 28px;border-radius:12px;margin:8px 0">${texto}</a>`;

/** E-mail de confirmação de conta nova. */
export async function enviarConfirmacao(req: Request, email: string, nome: string, token: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[verificar][DEV] Link para ${email}: ${linkDe(req, token)}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: mailFromContato(),
    to: [email],
    subject: emailSubject("Confirme seu e-mail"),
    html: brandedEmail(`
      <p style="margin-top:0">Olá, ${nome}!</p>
      <p>Falta um passo para ativar sua conta no Peltrack. Clique no botão abaixo para confirmar que este e-mail é seu:</p>
      <p style="text-align:center">${botao(linkDe(req, token), "Confirmar meu e-mail")}</p>
      <p style="color:#666;font-size:13px;margin-bottom:0">
        O link vale por ${VALIDADE_HORAS} horas e só funciona uma vez.<br/>
        Se você não criou esta conta, ignore esta mensagem. Nada será ativado.
      </p>
    `, true),
  });
  if (error) console.error("[verificar] falha ao enviar:", error.message);
}

/**
 * E-mail para quem tentou se cadastrar com um e-mail JÁ EXISTENTE.
 * Existe para o cadastro poder responder sempre a mesma coisa na tela: sem isso,
 * o erro "e-mail já cadastrado" permitiria varrer a base descobrindo clientes.
 */
export async function enviarContaJaExiste(req: Request, email: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[verificar][DEV] Conta já existe para ${email}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const entrar = new URL("/login", req.url).toString();
  await resend.emails.send({
    from: mailFromContato(),
    to: [email],
    subject: emailSubject("Você já tem uma conta"),
    html: brandedEmail(`
      <p style="margin-top:0">Olá!</p>
      <p>Alguém tentou criar uma conta no Peltrack com este e-mail, mas <strong>você já tem uma</strong>.</p>
      <p style="text-align:center">${botao(entrar, "Entrar na minha conta")}</p>
      <p style="color:#666;font-size:13px;margin-bottom:0">
        Esqueceu a senha? Use a opção de recuperação na tela de login.<br/>
        Se não foi você, pode ignorar. Nada mudou na sua conta.
      </p>
    `, true),
  }).catch(() => {});
}
