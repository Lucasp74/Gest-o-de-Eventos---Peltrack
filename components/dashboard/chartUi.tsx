/**
 * Peças visuais compartilhadas pelos gráficos do dashboard (recharts).
 * Nasceram dentro do ReportsView; saíram para cá quando a tela Financeiro
 * passou a precisar do mesmo visual. Fonte única do estilo dos gráficos.
 */

import { formatBRL } from "@/lib/planPricing";

export const LARANJA = "#1F8A7A"; // acento da marca (teal — mesmo valor de --color-laranja)
export const GRAFITE = "#1E2535";
export const GRAY = "#d4d8e0";

export const tooltipStyle = {
  cursor: { fill: "rgba(240,90,40,0.06)" },
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: GRAFITE, fontWeight: 600 },
};

/**
 * Formatador de valores em reais para o Tooltip.
 * Recebe `unknown` de propósito: o recharts tipa o valor como
 * `ValueType | undefined`, e uma função que aceita tudo satisfaz a assinatura.
 */
export const moedaTooltip =
  (rotulo: string) =>
  (v: unknown): [string, string] => [formatBRL(Number(v ?? 0)), rotulo];

/** Eixos com o mesmo tratamento em todos os gráficos. */
export const eixoX = {
  tick: { fontSize: 12, fill: "#6b7280" },
  tickLine: false,
  axisLine: { stroke: "#e5e7eb" },
} as const;

export const eixoY = {
  tick: { fontSize: 12, fill: "#6b7280" },
  tickLine: false,
  axisLine: false,
} as const;

export function ChartCard({
  title, subtitle, full, children,
}: {
  title: string;
  subtitle: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-card rounded-2xl border border-border p-6 ${full ? "lg:col-span-2" : ""}`}>
      <h3 className="text-foreground font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
      {message}
    </div>
  );
}

export function Legend({
  color, label, value,
}: {
  color: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground ml-auto">{value}</span>
    </div>
  );
}
