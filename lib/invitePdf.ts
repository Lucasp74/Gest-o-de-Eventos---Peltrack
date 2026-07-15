/**
 * Gera o convite em PDF no servidor (layout da marca Peltrack), para o
 * convidado baixar e usar offline. Inclui cabeçalho, dados do evento, o QR
 * Code e o nome. Usa jsPDF (funciona em Node — apenas texto + imagem).
 */
import { jsPDF } from "jspdf";

const GRAFITE = "#1E2535";
const LARANJA = "#F05A28";
const CINZA = "#6b7280";
const W = 148; // A5 retrato (mm)

export function buildInvitePdf(opts: {
  eventName: string;
  when: string;
  addressLines: string[];
  guestName: string;
  token: string;
  qrPngBase64: string;
}): Buffer {
  const { eventName, when, addressLines, guestName, token, qrPngBase64 } = opts;
  const doc = new jsPDF({ unit: "mm", format: "a5" });

  /* Cabeçalho */
  doc.setFillColor(GRAFITE);
  doc.rect(0, 0, W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#ffffff");
  doc.text("Pel", 14, 14);
  doc.setTextColor(LARANJA);
  doc.text("track", 14 + doc.getTextWidth("Pel"), 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#c7cbd4");
  doc.text("CONVITE", W - 14, 14, { align: "right" });

  /* Evento */
  let y = 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(GRAFITE);
  const nameLines = doc.splitTextToSize(eventName, W - 28) as string[];
  doc.text(nameLines, W / 2, y, { align: "center" });
  y += nameLines.length * 7 + 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(CINZA);
  doc.text(when, W / 2, y, { align: "center" });
  y += 6;

  addressLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, W - 28) as string[];
    doc.text(wrapped, W / 2, y, { align: "center" });
    y += wrapped.length * 4.6;
  });
  y += 6;

  /* QR Code */
  const qrSize = 58;
  doc.addImage(`data:image/png;base64,${qrPngBase64}`, "PNG", (W - qrSize) / 2, y, qrSize, qrSize);
  y += qrSize + 9;

  /* Convidado + instruções */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(GRAFITE);
  doc.text(guestName, W / 2, y, { align: "center" });
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(CINZA);
  doc.text("Apresente este QR Code na entrada do evento.", W / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor("#9ca3af");
  doc.text(`Código do convite: ${token.slice(0, 8)}`, W / 2, y, { align: "center" });

  /* Rodapé */
  doc.setFontSize(8);
  doc.setTextColor("#9ca3af");
  doc.text("Gerado pela plataforma Peltrack — peltrack.com.br", W / 2, 202, { align: "center" });

  return Buffer.from(doc.output("arraybuffer"));
}
