/**
 * Geração do relatório do evento em PDF (layout próprio da marca Peltrack).
 * Roda 100% no navegador: os gráficos (SVG do Recharts) são convertidos em
 * PNG de alta resolução e desenhados no documento junto de KPIs e tabela.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { EventItem } from "@/lib/mockEvents";

const GRAFITE = "#1E2535";
const LARANJA = "#F05A28";
const CINZA = "#6b7280";

const PAGE_W = 210; // A4 retrato (mm)
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

export interface ReportKpis {
  confirmados: number;
  presentes: number;
  ausentes: number;
  taxa: number; // %
  pico: string; // ex.: "20h (12 entradas)" ou "—"
}

export interface ReportCharts {
  hourly: SVGSVGElement | null;
  attendance: SVGSVGElement | null;
  daily: SVGSVGElement | null;
}

/* ── SVG (Recharts) → PNG em alta resolução ─────────────── */
async function svgToPng(svg: SVGSVGElement, scale = 3): Promise<{ dataUrl: string; ratio: number }> {
  const width = svg.clientWidth || svg.viewBox.baseVal.width || 600;
  const height = svg.clientHeight || svg.viewBox.baseVal.height || 240;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const source = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao converter o gráfico."));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // fundo branco (SVG é transparente)
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL("image/png"), ratio: height / width };
}

/* ── Documento ───────────────────────────────────────────── */
export async function generateEventReportPdf(
  event: EventItem,
  kpis: ReportKpis,
  byHour: { hora: string; entradas: number }[],
  charts: ReportCharts,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  /* Cabeçalho com a marca */
  doc.setFillColor(GRAFITE);
  doc.rect(0, 0, PAGE_W, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor("#ffffff");
  doc.text("Pel", MARGIN, 12);
  doc.setTextColor(LARANJA);
  doc.text("track", MARGIN + doc.getTextWidth("Pel"), 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#c7cbd4");
  doc.text("Relatório do evento", MARGIN, 19);
  const generated = new Date().toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  doc.text(`Gerado em ${generated}`, PAGE_W - MARGIN, 19, { align: "right" });

  /* Identificação do evento */
  y = 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(GRAFITE);
  const nameLines = doc.splitTextToSize(event.name, CONTENT_W);
  doc.text(nameLines, MARGIN, y);
  y += nameLines.length * 6 + 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(CINZA);
  doc.text(`${event.dateLabel} · ${event.time}   |   ${event.local}`, MARGIN, y);
  y += 9;

  /* KPIs (4 caixas) */
  const boxW = (CONTENT_W - 3 * 4) / 4;
  const boxH = 22;
  const kpiList = [
    { label: "Confirmados", value: String(kpis.confirmados) },
    { label: "Presentes", value: String(kpis.presentes), accent: true },
    { label: "Comparecimento", value: `${kpis.taxa}%` },
    { label: "Horário de pico", value: kpis.pico },
  ];
  kpiList.forEach((k, i) => {
    const x = MARGIN + i * (boxW + 4);
    doc.setFillColor("#f8f8f8");
    doc.roundedRect(x, y, boxW, boxH, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(k.value.length > 8 ? 11 : 15);
    doc.setTextColor(k.accent ? LARANJA : GRAFITE);
    doc.text(k.value, x + 4, y + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(CINZA);
    doc.text(k.label, x + 4, y + 17);
  });
  y += boxH + 12;

  /* Gráficos */
  const addChart = async (title: string, svg: SVGSVGElement | null) => {
    if (!svg) return;
    const { dataUrl, ratio } = await svgToPng(svg);
    const imgH = CONTENT_W * ratio;
    // Quebra de página se não couber (título + imagem)
    if (y + imgH + 12 > PAGE_H - 16) {
      doc.addPage();
      y = MARGIN + 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(GRAFITE);
    doc.text(title, MARGIN, y);
    y += 4;
    doc.addImage(dataUrl, "PNG", MARGIN, y, CONTENT_W, imgH);
    y += imgH + 10;
  };

  await addChart("Fluxo de entrada por hora", charts.hourly);
  await addChart("Comparecimento (presentes × ausentes)", charts.attendance);
  await addChart("Confirmações ao longo do tempo", charts.daily);

  /* Tabela: entradas por hora */
  if (byHour.length > 0) {
    if (y + 30 > PAGE_H - 16) {
      doc.addPage();
      y = MARGIN + 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(GRAFITE);
    doc.text("Entradas por hora (detalhamento)", MARGIN, y);
    autoTable(doc, {
      startY: y + 3,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Hora", "Entradas"]],
      body: byHour.map((h) => [h.hora, String(h.entradas)]),
      styles: { fontSize: 9, textColor: GRAFITE, cellPadding: 2.5 },
      headStyles: { fillColor: GRAFITE, textColor: "#ffffff", fontStyle: "bold" },
      alternateRowStyles: { fillColor: "#f8f8f8" },
    });
  }

  /* Rodapé em todas as páginas */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#9ca3af");
    doc.text("Gerado pela plataforma Peltrack — peltrack.com.br", MARGIN, PAGE_H - 8);
    doc.text(`Página ${p} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }

  const slug = event.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "evento";
  doc.save(`relatorio_${slug}.pdf`);
}
