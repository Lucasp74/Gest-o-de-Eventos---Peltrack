/**
 * Layout base de TODOS os e-mails da Peltrack (Resend): cabeçalho da marca +
 * corpo em card, na paleta atual (grafite + teal). Centraliza a identidade e a
 * regra do assunto para que qualquer e-mail novo já saia padronizado.
 */
const GRAFITE = "#1E2535";
const TEAL = "#1F8A7A"; // acento da marca (= --color-laranja no CSS)

/** Assunto padronizado: sempre "Peltrack - <assunto>". */
export const emailSubject = (assunto: string) => `Peltrack - ${assunto}`;

/**
 * Remetente de TODOS os e-mails — ponto único de verdade.
 * O fallback é o sandbox do Resend, que só entrega para o dono da conta; em
 * produção o MAIL_FROM precisa apontar para o domínio verificado.
 * Existe porque um dos envios tinha o sandbox fixo no código e ignorava a
 * variável — o convite com QR nunca chegava em ninguém além do dono da conta.
 */
export const mailFrom = () => process.env.MAIL_FROM || "Peltrack <onboarding@resend.dev>";

/**
 * Remetente dos e-mails de CONTA (confirmação de cadastro, aviso de conta
 * existente). Sai de contato@, não de convites@: não tem relação com evento
 * nenhum, e é o canal que o cliente já vê publicado no site.
 * O domínio é derivado do MAIL_FROM para não existir endereço fixo no código,
 * que foi o bug do convite em 07/08.
 */
export function mailFromContato(): string {
  const base = mailFrom();
  const dominio = base.match(/@([^>\s]+)/)?.[1];
  return dominio ? `Peltrack <contato@${dominio}>` : base;
}

/**
 * Mesmo endereço de sempre, mas exibindo o NOME DA ORGANIZAÇÃO — o convidado vê
 * "Colégio Platão", não "Peltrack". O endereço não muda (é o domínio verificado);
 * trocar o endereço seria falsificação e o convite cairia em spam.
 * Sem nome, devolve o remetente padrão.
 */
export function mailFromOrganizador(nome?: string | null): string {
  const base = mailFrom();
  // Tira aspas, sinais de maior/menor e QUEBRAS DE LINHA: nome vem do cliente e
  // um "\n" ali permitiria injetar cabeçalho de e-mail.
  const limpo = (nome ?? "").replace(/[\r\n"<>\\]/g, "").trim().slice(0, 60);
  if (!limpo) return base;
  const endereco = base.match(/<([^>]+)>/)?.[1] ?? base;
  return `${limpo} <${endereco}>`;
}

/** Embrulha o conteúdo (HTML) no layout da marca. `center` centraliza o corpo. */
export function brandedEmail(body: string, center = false): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:${GRAFITE}">
      <div style="background:${GRAFITE};border-radius:16px 16px 0 0;padding:20px 24px">
        <span style="color:#fff;font-size:18px;font-weight:bold">Pel<span style="color:${TEAL}">track</span></span>
      </div>
      <div style="border:1px solid #eee;border-top:0;border-radius:0 0 16px 16px;padding:24px${center ? ";text-align:center" : ""}">
        ${body}
      </div>
    </div>`;
}
