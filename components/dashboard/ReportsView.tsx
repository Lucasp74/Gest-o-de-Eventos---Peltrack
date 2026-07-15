"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  CheckCircle2, UserCheck, Percent, Clock, Download, BarChart3,
  FileSpreadsheet, FileText, ChevronDown, Loader2,
} from "lucide-react";
import { type EventItem } from "@/lib/mockEvents";
import {
  fetchConfirmations, fetchCheckins,
  type Confirmation, type CheckinRecord,
} from "@/lib/eventData";

const LARANJA = "#F05A28";
const GRAFITE = "#1E2535";
const GRAY = "#d4d8e0";

export default function ReportsView({ event, liveTick = 0 }: { event: EventItem; liveTick?: number }) {
  const [confs, setConfs] = useState<Confirmation[]>([]);
  const [checks, setChecks] = useState<CheckinRecord[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Contêineres dos gráficos (para converter o SVG em imagem no PDF)
  const hourlyRef = useRef<HTMLDivElement>(null);
  const attendanceRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConfirmations(event.id).then(setConfs);
    fetchCheckins(event.id).then(setChecks);
  }, [event.id, liveTick]);

  /* ── Métricas ──────────────────────────────────── */
  const confirmados = confs.filter((c) => c.status === "confirmado").length;
  const presentes = checks.length;
  const ausentes = Math.max(confirmados - presentes, 0);
  const taxa = confirmados > 0 ? Math.round((presentes / confirmados) * 100) : 0;

  /* ── Fluxo por hora ────────────────────────────── */
  const byHour = useMemo(() => {
    if (checks.length === 0) return [];
    const map = new Map<number, number>();
    checks.forEach((c) => {
      const h = new Date(c.checkedInAt).getHours();
      map.set(h, (map.get(h) ?? 0) + 1);
    });
    const hours = [...map.keys()];
    const min = Math.min(...hours);
    const max = Math.max(...hours);
    const data: { hora: string; entradas: number }[] = [];
    for (let h = min; h <= max; h++) {
      data.push({ hora: `${h}h`, entradas: map.get(h) ?? 0 });
    }
    return data;
  }, [checks]);

  const pico = useMemo(() => {
    if (byHour.length === 0) return null;
    return byHour.reduce((a, b) => (b.entradas > a.entradas ? b : a));
  }, [byHour]);

  /* ── Comparecimento (donut) ────────────────────── */
  const comparecimento = [
    { name: "Presentes", value: presentes, color: LARANJA },
    { name: "Ausentes", value: ausentes, color: GRAY },
  ];

  /* ── Confirmações por dia ──────────────────────── */
  const byDay = useMemo(() => {
    const ativos = confs.filter((c) => c.status !== "cancelado");
    if (ativos.length === 0) return [];
    const map = new Map<string, number>();
    ativos.forEach((c) => {
      const d = c.createdAt.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, n]) => {
        const [, m, day] = d.split("-");
        return { dia: `${day}/${m}`, confirmacoes: n };
      });
  }, [confs]);

  /* ── Exportar CSV ──────────────────────────────── */
  function exportCsv() {
    const lines: string[][] = [
      ["Métrica", "Valor"],
      ["Confirmados", String(confirmados)],
      ["Presentes", String(presentes)],
      ["Ausentes", String(ausentes)],
      ["Taxa de comparecimento", `${taxa}%`],
      ["Horário de pico", pico ? `${pico.hora} (${pico.entradas} entradas)` : "—"],
      [],
      ["Hora", "Entradas"],
      ...byHour.map((h) => [h.hora, String(h.entradas)]),
    ];
    const csv = lines
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${event.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Exportar PDF (layout próprio + gráficos) ──── */
  async function exportPdf() {
    setPdfBusy(true);
    try {
      // Import dinâmico: o jsPDF só é baixado quando o usuário pede o PDF
      const { generateEventReportPdf } = await import("@/lib/reportPdf");
      await generateEventReportPdf(
        event,
        {
          confirmados,
          presentes,
          ausentes,
          taxa,
          pico: pico ? `${pico.hora} (${pico.entradas})` : "—",
        },
        byHour,
        {
          hourly: hourlyRef.current?.querySelector("svg") ?? null,
          attendance: attendanceRef.current?.querySelector("svg") ?? null,
          daily: dailyRef.current?.querySelector("svg") ?? null,
        },
      );
    } finally {
      setPdfBusy(false);
    }
  }

  const stats = [
    { label: "Confirmados", value: confirmados, icon: CheckCircle2 },
    { label: "Presentes", value: presentes, icon: UserCheck, accent: true },
    { label: "Comparecimento", value: `${taxa}%`, icon: Percent },
    { label: "Horário de pico", value: pico ? pico.hora : "—", icon: Clock },
  ];

  const hasData = confs.length > 0 || checks.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
          <BarChart3 className="w-7 h-7 text-gray-300" />
        </div>
        <h3 className="text-grafite font-semibold text-base mb-1">Sem dados para relatório ainda</h3>
        <p className="text-grafite-muted text-sm max-w-xs">
          Os gráficos aparecem aqui conforme os convidados confirmam presença e fazem check-in no evento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + exportar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-grafite">Relatórios</h2>
          <p className="text-grafite-muted text-sm">Análise de confirmações e presença do evento</p>
        </div>
        {/* Menu de exportação: Excel ou PDF */}
        <div className="relative">
          <button
            onClick={() => setExportOpen((o) => !o)}
            disabled={pdfBusy}
            className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 disabled:opacity-60 text-grafite px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
          </button>

          {exportOpen && (
            <>
              {/* fecha ao clicar fora */}
              <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-40 w-56 bg-white rounded-xl border border-gray-200 shadow-xl shadow-black/5 overflow-hidden py-1">
                <button
                  onClick={() => { setExportOpen(false); exportCsv(); }}
                  className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-fundo transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-grafite">Excel (CSV)</span>
                    <span className="block text-xs text-grafite-muted">Dados tabulados para planilha</span>
                  </span>
                </button>
                <button
                  onClick={() => { setExportOpen(false); exportPdf(); }}
                  className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-fundo transition-colors"
                >
                  <FileText className="w-4 h-4 text-laranja mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-grafite">PDF com gráficos</span>
                    <span className="block text-xs text-grafite-muted">Relatório visual pronto para compartilhar</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.accent ? "bg-laranja/10" : "bg-grafite/5"}`}>
              <s.icon className={`w-5 h-5 ${s.accent ? "text-laranja" : "text-grafite"}`} />
            </div>
            <p className={`text-2xl font-bold ${s.accent ? "text-laranja" : "text-grafite"}`}>{s.value}</p>
            <p className="text-grafite-muted text-sm mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo por hora */}
        <ChartCard title="Fluxo de entrada por hora" subtitle="Check-ins registrados em cada horário">
          {byHour.length === 0 ? (
            <EmptyChart message="Nenhum check-in registrado ainda" />
          ) : (
            <div ref={hourlyRef}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byHour} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                  <XAxis dataKey="hora" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="entradas" fill={LARANJA} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Comparecimento (donut) */}
        <ChartCard title="Comparecimento" subtitle="Presentes vs. ausentes (confirmados que não vieram)">
          {confirmados === 0 ? (
            <EmptyChart message="Nenhuma confirmação ainda" />
          ) : (
            <div className="flex items-center gap-6">
              <div ref={attendanceRef} className="flex-1 min-w-0" style={{ width: "60%" }}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={comparecimento} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} strokeWidth={0}>
                      {comparecimento.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <Legend color={LARANJA} label="Presentes" value={presentes} />
                <Legend color={GRAY} label="Ausentes" value={ausentes} />
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-2xl font-bold text-laranja">{taxa}%</p>
                  <p className="text-grafite-muted text-xs">de comparecimento</p>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Confirmações por dia */}
        <ChartCard title="Confirmações ao longo do tempo" subtitle="Ritmo de confirmações por dia" full>
          {byDay.length === 0 ? (
            <EmptyChart message="Nenhuma confirmação ainda" />
          ) : (
            <div ref={dailyRef}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={byDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={LARANJA} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={LARANJA} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="confirmacoes" stroke={LARANJA} strokeWidth={2.5} fill="url(#confGradient)" />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ── Auxiliares ──────────────────────────────────── */
const tooltipStyle = {
  cursor: { fill: "rgba(240,90,40,0.06)" },
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: GRAFITE, fontWeight: 600 },
};

function ChartCard({
  title, subtitle, full, children,
}: {
  title: string;
  subtitle: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 ${full ? "lg:col-span-2" : ""}`}>
      <h3 className="text-grafite font-semibold">{title}</h3>
      <p className="text-grafite-muted text-sm mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-grafite-muted text-sm">
      {message}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-sm text-grafite-muted">{label}</span>
      <span className="text-sm font-semibold text-grafite ml-auto">{value}</span>
    </div>
  );
}
