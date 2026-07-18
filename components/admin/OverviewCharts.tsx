"use client";

/**
 * Gráficos da Visão geral do admin:
 *  1. Crescimento acumulado (clientes × usuários) — área com gradiente
 *  2. Distribuição de clientes por plano — donut com total no centro
 * Paleta validada (CVD-safe): laranja #F05A28 · azul-aço #3E6DB5 · teal #0E9888
 */
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts";

const LARANJA = "#F05A28";
const AZUL = "#3E6DB5";
const TEAL = "#0E9888";
const GRAFITE = "#1E2535";

export const PLAN_COLORS: Record<string, string> = {
  STARTER: TEAL,
  PRO: AZUL,
  ENTERPRISE: LARANJA,
};
const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  labelStyle: { color: GRAFITE, fontWeight: 600 },
};

export interface GrowthPoint {
  month: string; // "jan/26"
  clientes: number; // acumulado
  usuarios: number; // acumulado
}

/* ── 1. Crescimento acumulado ────────────────────────── */
export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gClientes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LARANJA} stopOpacity={0.22} />
            <stop offset="100%" stopColor={LARANJA} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gUsuarios" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AZUL} stopOpacity={0.18} />
            <stop offset="100%" stopColor={AZUL} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend
          verticalAlign="top"
          align="right"
          height={28}
          iconType="plainline"
          formatter={(v: string) => (
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              {v === "clientes" ? "Clientes" : "Usuários"}
            </span>
          )}
        />
        <Area type="monotone" dataKey="usuarios" name="usuarios" stroke={AZUL} strokeWidth={2} fill="url(#gUsuarios)" dot={false} activeDot={{ r: 4 }} />
        <Area type="monotone" dataKey="clientes" name="clientes" stroke={LARANJA} strokeWidth={2} fill="url(#gClientes)" dot={false} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── 2. Donut: clientes por plano ────────────────────── */
export function PlanDonut({ data }: { data: { plan: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const slices = data.filter((d) => d.count > 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative w-[220px] h-[220px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="count"
              nameKey="plan"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={2}
              stroke="#ffffff"
            >
              {slices.map((d) => (
                <Cell key={d.plan} fill={PLAN_COLORS[d.plan] ?? "#d4d8e0"} />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value, name) => [
                `${Number(value)} cliente${Number(value) === 1 ? "" : "s"}`,
                PLAN_LABELS[String(name)] ?? String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Total no centro */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-foreground leading-none">{total}</span>
          <span className="text-muted-foreground text-xs mt-1">clientes</span>
        </div>
      </div>

      {/* Legenda com contagens */}
      <div className="space-y-3 min-w-[160px]">
        {data.map((d) => (
          <div key={d.plan} className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: PLAN_COLORS[d.plan] }} />
            <span className="text-sm text-muted-foreground">{PLAN_LABELS[d.plan] ?? d.plan}</span>
            <span className="text-sm font-semibold text-foreground ml-auto">{d.count}</span>
            <span className="text-xs text-muted-foreground w-10 text-right">
              {total > 0 ? Math.round((d.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
