/**
 * Aviso de escala: "você foi escalado para o evento X".
 *
 * Faz sentido existir porque, com a escala, o operador só enxerga os eventos em
 * que trabalha. Sem este aviso ele aceita o convite e depois não fica sabendo de
 * nada, e teria que abrir o app de tempos em tempos para descobrir se apareceu
 * trabalho. Diferente de um lembrete repetido, aqui a mensagem é a única fonte
 * da informação.
 */
import { Resend } from "resend";
import { brandedEmail, emailSubject, mailFromContato } from "@/lib/emailLayout";
import { eventWhen } from "@/lib/inviteEmail";

export type EventoDaEscala = {
  name: string;
  startAt: Date;
  venue: string | null;
  city: string | null;
};

export async function enviarEscala(
  req: Request,
  dados: { para: string; nome: string | null; evento: EventoDaEscala },
) {
  const { evento } = dados;
  const quando = eventWhen(evento.startAt);
  const onde = [evento.venue, evento.city].filter(Boolean).join(", ");
  const link = new URL("/dashboard", req.url).toString();

  if (!process.env.RESEND_API_KEY) {
    console.log(`[escala][DEV] ${dados.para} escalado em "${evento.name}" (${quando})`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: mailFromContato(),
    to: [dados.para],
    subject: emailSubject(`Você foi escalado: ${evento.name}`),
    html: brandedEmail(`
      <p style="margin-top:0">Olá${dados.nome ? `, ${dados.nome}` : ""}!</p>
      <p>Você foi escalado para trabalhar no evento
         <strong>${evento.name}</strong>.</p>
      <table style="margin:16px 0;font-size:14px">
        <tr><td style="padding:4px 12px 4px 0;color:#666">Quando</td><td><strong>${quando}</strong></td></tr>
        ${onde ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Onde</td><td><strong>${onde}</strong></td></tr>` : ""}
      </table>
      <p>O evento já aparece na sua conta, com a lista de convidados e o scanner de entrada.</p>
      <p style="text-align:center">
        <a href="${link}" style="display:inline-block;background:#1F8A7A;color:#fff;text-decoration:none;
           font-weight:bold;padding:14px 28px;border-radius:12px;margin:8px 0">Abrir o Peltrack</a>
      </p>
      <p style="color:#666;font-size:13px;margin-bottom:0">
        Se você acha que houve engano, fale com quem administra a organização.
      </p>
    `, true),
  });
  if (error) console.error("[escala] falha ao enviar:", error.message);
}
