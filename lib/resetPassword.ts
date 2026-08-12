/**
 * Recuperação de senha.
 *
 * Guarda apenas o HASH do token (sha256), mesmo padrão da confirmação de conta:
 * se o banco vazar, ninguém troca a senha de terceiros com o que leu. O token em
 * claro só existe no link enviado por e-mail.
 *
 * Reusa a tabela VerificationToken, sem migração, mas com o identificador
 * PREFIXADO por "reset:". Sem esse prefixo os dois fluxos se derrubariam: pedir
 * recuperação apagaria uma confirmação de conta pendente, e vice-versa.
 *
 * Validade curta, de 30 minutos, escolhida pelo Lucas: link de troca de senha é
 * mais perigoso que link de confirmação, porque quem o intercepta assume a conta.
 */
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { brandedEmail, emailSubject, mailFromContato } from "@/lib/emailLayout";

const VALIDADE_MIN = 30;
const PREFIXO = "reset:";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const identificador = (email: string) => `${PREFIXO}${email.toLowerCase().trim()}`;

/** Cria o token de recuperação, invalidando pedidos anteriores do mesmo e-mail. */
export async function criarTokenReset(email: string): Promise<string> {
  const id = identificador(email);
  const token = randomBytes(32).toString("base64url");

  await prisma.verificationToken.deleteMany({ where: { identifier: id } });
  await prisma.verificationToken.create({
    data: {
      identifier: id,
      token: hashToken(token),
      expires: new Date(Date.now() + VALIDADE_MIN * 60_000),
    },
  });
  return token;
}

/**
 * Confere o token SEM consumir. Serve para a página decidir se mostra o
 * formulário ou a tela de link expirado, antes de a pessoa digitar qualquer coisa.
 */
export async function lerTokenReset(token: string): Promise<string | null> {
  if (!token) return null;
  const registro = await prisma.verificationToken.findFirst({
    where: { token: hashToken(token), identifier: { startsWith: PREFIXO } },
  });
  if (!registro || registro.expires < new Date()) return null;
  return registro.identifier.slice(PREFIXO.length);
}

/** Consome o token (uso único) e devolve o e-mail dono dele. */
export async function consumirTokenReset(token: string): Promise<string | null> {
  const email = await lerTokenReset(token);
  if (!email) return null;
  await prisma.verificationToken.deleteMany({ where: { identifier: identificador(email) } });
  return email;
}

/** E-mail com o link de redefinição. */
export async function enviarReset(req: Request, email: string, nome: string, token: string) {
  const link = new URL(`/redefinir-senha?token=${encodeURIComponent(token)}`, req.url).toString();

  if (!process.env.RESEND_API_KEY) {
    console.log(`[reset][DEV] Link para ${email}: ${link}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: mailFromContato(),
    to: [email],
    subject: emailSubject("Redefinir sua senha"),
    html: brandedEmail(`
      <p style="margin-top:0">Olá${nome ? `, ${nome}` : ""}!</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta no Peltrack. Clique no botão abaixo para escolher uma nova:</p>
      <p style="text-align:center">
        <a href="${link}" style="display:inline-block;background:#1F8A7A;color:#fff;text-decoration:none;
           font-weight:bold;padding:14px 28px;border-radius:12px;margin:8px 0">Redefinir minha senha</a>
      </p>
      <p style="color:#666;font-size:13px;margin-bottom:0">
        O link vale por ${VALIDADE_MIN} minutos e só funciona uma vez.<br/>
        Se não foi você que pediu, ignore esta mensagem. Sua senha atual continua valendo.
      </p>
    `, true),
  });
  if (error) console.error("[reset] falha ao enviar:", error.message);
}
