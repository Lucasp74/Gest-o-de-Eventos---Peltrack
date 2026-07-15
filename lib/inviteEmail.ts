/**
 * Envio do convite por e-mail (Resend) com o QR Code gerado no servidor.
 * Usado na confirmação pública e no "reenviar convite" do painel.
 * Sem RESEND_API_KEY (dev), apenas registra no log — não quebra o fluxo.
 */
import { Resend } from "resend";
import QRCode from "qrcode";
import { buildInvitePdf } from "@/lib/invitePdf";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const p = (n: number) => String(n).padStart(2, "0");

type InviteEvent = {
  name: string;
  startAt: Date;
  venue: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  uf: string | null;
  cep: string | null;
};

function eventWhen(startAt: Date): string {
  return `${p(startAt.getUTCDate())} de ${MONTHS[startAt.getUTCMonth()]} de ${startAt.getUTCFullYear()} · ${p(startAt.getUTCHours())}:${p(startAt.getUTCMinutes())}`;
}

/** Monta o endereço completo em linhas (pula campos vazios). */
function formatAddressLines(e: InviteEvent): string[] {
  const lines: string[] = [];
  if (e.venue) lines.push(e.venue);

  const rua = [e.street, e.number].filter(Boolean).join(", ");
  if (rua) lines.push(rua);
  if (e.complement) lines.push(e.complement);

  const cidadeUf = [e.city, e.uf].filter(Boolean).join("/");
  const bairroCidade = [e.district, cidadeUf].filter(Boolean).join(" — ");
  if (bairroCidade) lines.push(bairroCidade);

  if (e.cep) lines.push(`CEP ${e.cep}`);
  if (lines.length === 0) lines.push("Local a definir");
  return lines;
}

export async function sendInviteEmail(opts: {
  to: string;
  name: string;
  token: string;
  event: InviteEvent;
  waitlist?: boolean;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const { to, name, token, event, waitlist, idempotencyKey } = opts;
  const when = eventWhen(event.startAt);
  const addressLines = formatAddressLines(event);
  const addressHtml = addressLines.join("<br/>");

  // Sem chave (dev) → não envia, só registra.
  if (!process.env.RESEND_API_KEY) {
    console.log(`[invite][DEV] Convite de "${event.name}" para ${to} (${waitlist ? "lista de espera" : "confirmado"})`);
    return { ok: true, skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const idem = idempotencyKey ? { idempotencyKey } : undefined;

  /* Lista de espera — e-mail simples, sem QR */
  if (waitlist) {
    const { error } = await resend.emails.send({
      from: process.env.MAIL_FROM || "Peltrack <onboarding@resend.dev>",
      to: [to],
      subject: `Lista de espera — ${event.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1E2535">
          <div style="background:#1E2535;border-radius:16px 16px 0 0;padding:20px 24px">
            <span style="color:#fff;font-size:18px;font-weight:bold">Pel<span style="color:#F05A28">track</span></span>
          </div>
          <div style="border:1px solid #eee;border-top:0;border-radius:0 0 16px 16px;padding:24px">
            <p>Olá, ${name}!</p>
            <p>O evento <strong>${event.name}</strong> (${when}) está com as vagas esgotadas, então você entrou na <strong>lista de espera</strong>.</p>
            <p style="color:#666;font-size:13px">Se uma vaga for liberada, você recebe o convite com o QR Code por aqui.</p>
          </div>
        </div>`,
    }, idem);
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  /* Confirmado — QR inline (via CID) + convite em PDF anexo */
  const qrPng = await QRCode.toBuffer(token, {
    type: "png", width: 300, margin: 1,
    color: { dark: "#1E2535", light: "#ffffff" }, errorCorrectionLevel: "M",
  });
  const qrBase64 = qrPng.toString("base64");
  const pdf = buildInvitePdf({ eventName: event.name, when, addressLines, guestName: name, token, qrPngBase64: qrBase64 });

  const { error } = await resend.emails.send({
    from: "Peltrack <onboarding@resend.dev>",
    to: [to],
    subject: `Seu convite — ${event.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1E2535">
        <div style="background:#1E2535;border-radius:16px 16px 0 0;padding:20px 24px">
          <span style="color:#fff;font-size:18px;font-weight:bold">Pel<span style="color:#F05A28">track</span></span>
        </div>
        <div style="border:1px solid #eee;border-top:0;border-radius:0 0 16px 16px;padding:24px;text-align:center">
          <p style="text-align:left;margin-top:0">Olá, ${name}! Sua presença está <strong>confirmada</strong>. 🎉</p>
          <h2 style="margin:8px 0 2px">${event.name}</h2>
          <p style="color:#666;margin:0 0 4px">${when}</p>
          <p style="color:#666;margin:0 0 20px;line-height:1.5">${addressHtml}</p>
          <img src="cid:qrcode" alt="QR Code do convite" width="220" height="220" style="border:1px solid #eee;border-radius:12px;padding:8px" />
          <p style="font-weight:bold;margin:16px 0 2px">${name}</p>
          <p style="color:#666;font-size:13px;margin:0">Apresente este QR Code na entrada do evento.</p>
          <p style="color:#999;font-size:12px;margin-top:16px">Código do convite: ${token.slice(0, 8)}<br/>(o convite completo está anexado em PDF, para salvar ou imprimir)</p>
        </div>
      </div>`,
    attachments: [
      { filename: "convite.pdf", content: pdf.toString("base64") },
      { filename: "qrcode.png", content: qrBase64, contentId: "qrcode" },
    ],
  }, idem);

  return error ? { ok: false, error: error.message } : { ok: true };
}
