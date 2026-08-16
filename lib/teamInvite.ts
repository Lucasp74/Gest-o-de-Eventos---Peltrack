/**
 * Convite para entrar numa organização (equipe).
 *
 * Guarda apenas o HASH do token (sha256), mesmo padrão da confirmação de conta e
 * da recuperação de senha: se o banco vazar, ninguém entra em organização alheia
 * com o que leu. O token em claro só existe no link enviado por e-mail.
 *
 * Reusa a tabela VerificationToken, SEM MIGRAÇÃO, com o identificador prefixado
 * por "equipe:". É o terceiro fluxo a usar essa tabela, e o prefixo é o que
 * impede um derrubar o outro: pedir recuperação de senha não pode invalidar um
 * convite pendente, e vice-versa.
 *
 * O identificador carrega TUDO que o aceite precisa saber:
 *   equipe:<tenantId>:<papel>:<email>
 * Assim o convite já nasce amarrado a uma organização e a um papel, e nada disso
 * viaja pelo navegador onde poderia ser adulterado.
 */
import { createHash, randomBytes } from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { brandedEmail, emailSubject, mailFromContato } from "@/lib/emailLayout";

/** Convite vale uma semana: quem contrata equipe raramente aceita no mesmo dia. */
const VALIDADE_DIAS = 7;
const PREFIXO = "equipe:";

export type PapelConvite = "DONO" | "OPERADOR";
export type Convite = { tenantId: string; papel: PapelConvite; email: string };

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

const identificador = (c: Convite) =>
  `${PREFIXO}${c.tenantId}:${c.papel}:${c.email.toLowerCase().trim()}`;

/** Desmonta o identificador. O e-mail é remontado porque só ele pode conter ":". */
function parse(identifier: string): Convite | null {
  const resto = identifier.slice(PREFIXO.length);
  const partes = resto.split(":");
  if (partes.length < 3) return null;
  const [tenantId, papel, ...emailPartes] = partes;
  if (papel !== "DONO" && papel !== "OPERADOR") return null;
  return { tenantId, papel, email: emailPartes.join(":") };
}

/** Cria o convite, cancelando qualquer convite anterior para o mesmo e-mail na mesma organização. */
export async function criarConvite(c: Convite): Promise<string> {
  const id = identificador(c);
  const token = randomBytes(32).toString("base64url");

  await prisma.verificationToken.deleteMany({ where: { identifier: id } });
  await prisma.verificationToken.create({
    data: {
      identifier: id,
      token: hashToken(token),
      expires: new Date(Date.now() + VALIDADE_DIAS * 86_400_000),
    },
  });
  return token;
}

/** Confere o convite SEM consumir, para a página decidir o que mostrar. */
export async function lerConvite(token: string): Promise<Convite | null> {
  if (!token) return null;
  const registro = await prisma.verificationToken.findFirst({
    where: { token: hashToken(token), identifier: { startsWith: PREFIXO } },
  });
  if (!registro || registro.expires < new Date()) return null;
  return parse(registro.identifier);
}

/** Consome o convite (uso único). */
export async function consumirConvite(token: string): Promise<Convite | null> {
  const convite = await lerConvite(token);
  if (!convite) return null;
  await prisma.verificationToken.deleteMany({ where: { identifier: identificador(convite) } });
  return convite;
}

/** Convites ainda pendentes de uma organização, para a tela de equipe listar. */
export async function convitesPendentes(tenantId: string) {
  const registros = await prisma.verificationToken.findMany({
    where: { identifier: { startsWith: `${PREFIXO}${tenantId}:` }, expires: { gt: new Date() } },
    select: { identifier: true, expires: true },
  });
  return registros
    .map((r) => ({ ...parse(r.identifier), expira: r.expires }))
    .filter((c): c is Convite & { expira: Date } => !!c.tenantId);
}

/**
 * Cancela o convite pendente de UM e-mail nesta organização.
 * Casa por início e fim do identificador porque o papel fica no meio dele e não
 * é conhecido na hora de cancelar.
 */
export async function cancelarConvite(tenantId: string, email: string) {
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: {
        startsWith: `${PREFIXO}${tenantId}:`,
        endsWith: `:${email.toLowerCase().trim()}`,
      },
    },
  });
}

/** E-mail do convite. Sai do contato@, porque é assunto de conta e não de evento. */
export async function enviarConvite(
  req: Request,
  dados: { email: string; papel: PapelConvite; organizacao: string; convidadoPor: string; token: string },
) {
  const link = new URL(`/convite/${encodeURIComponent(dados.token)}`, req.url).toString();
  const papelLabel = dados.papel === "DONO" ? "dono" : "operador";
  const oQuePode =
    dados.papel === "DONO"
      ? "Como dono, você terá acesso a tudo na organização, incluindo financeiro, cobrança e configurações."
      : "Como operador, você vai poder usar o scanner, ver a lista de convidados e acompanhar a presença. Financeiro e configurações da conta ficam com o dono.";

  if (!process.env.RESEND_API_KEY) {
    console.log(`[equipe][DEV] Convite para ${dados.email}: ${link}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: mailFromContato(),
    to: [dados.email],
    subject: emailSubject(`Convite para a equipe de ${dados.organizacao}`),
    html: brandedEmail(`
      <p style="margin-top:0">Olá!</p>
      <p><strong>${dados.convidadoPor}</strong> convidou você para fazer parte da equipe de
         <strong>${dados.organizacao}</strong> no Peltrack, como <strong>${papelLabel}</strong>.</p>
      <p>${oQuePode}</p>
      <p style="text-align:center">
        <a href="${link}" style="display:inline-block;background:#1F8A7A;color:#fff;text-decoration:none;
           font-weight:bold;padding:14px 28px;border-radius:12px;margin:8px 0">Aceitar convite</a>
      </p>
      <p style="color:#666;font-size:13px;margin-bottom:0">
        O link vale por ${VALIDADE_DIAS} dias e só funciona uma vez.<br/>
        Se você não esperava este convite, pode ignorar esta mensagem.
      </p>
    `, true),
  });
  if (error) console.error("[equipe] falha ao enviar convite:", error.message);
}
