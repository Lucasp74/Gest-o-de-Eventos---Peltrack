"use client";

/**
 * Gestão de clientes do admin: gráfico por plano (clicável = filtro),
 * filtro por plano, lista com uso (eventos no mês/limite) e receita mensal,
 * e o modal de provisionamento (plano, valor, limites, flags, chave de API).
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import {
  Building2, Settings2, X, Loader2, Check, KeyRound, Copy, Users, Calendar,
} from "lucide-react";
import { PLAN_COLORS } from "@/components/admin/OverviewCharts";
import { effectiveMonthlyPrice, formatBRL, PLAN_DEFAULTS } from "@/lib/planPricing";

export type AdminTenant = {
  id: string;
  name: string;
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  monthlyPrice: number | null;
  maxEventsPerMonth: number;
  maxGuestsPerEvent: number;
  flagAdvancedReports: boolean;
  flagDesktopSync: boolean;
  flagApiAccess: boolean;
  apiKey: string | null;
  users: number;
  events: number;
  eventsThisMonth: number;
};

type PlanKey = "STARTER" | "PRO" | "ENTERPRISE";
type FilterKey = "TODOS" | PlanKey;

const PLAN_BADGE: Record<string, string> = {
  STARTER: "bg-teal-50 text-teal-700 border-teal-200",
  PRO: "bg-blue-50 text-blue-700 border-blue-200",
  ENTERPRISE: "bg-laranja/10 text-laranja border-laranja/20",
};
const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter", PRO: "Pro", ENTERPRISE: "Enterprise",
};

export default function ClientsManager({ tenants }: { tenants: AdminTenant[] }) {
  const [editing, setEditing] = useState<AdminTenant | null>(null);
  const [filter, setFilter] = useState<FilterKey>("TODOS");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const byPlan = useMemo(
    () =>
      (["STARTER", "PRO", "ENTERPRISE"] as PlanKey[]).map((plan) => ({
        plan,
        label: PLAN_LABELS[plan],
        count: tenants.filter((t) => t.plan === plan).length,
      })),
    [tenants],
  );

  const filtered = filter === "TODOS" ? tenants : tenants.filter((t) => t.plan === filter);

  if (tenants.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-dashed border-border py-16 text-center">
        <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-semibold">Nenhum cliente ainda</p>
        <p className="text-muted-foreground text-sm">Os clientes aparecem aqui conforme se cadastram na plataforma.</p>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-grafite text-white text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}
      {/* Gráfico: clientes por plano (clicar numa barra filtra a lista) */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-foreground font-semibold">Clientes por plano</h2>
          <span className="text-muted-foreground text-xs">clique numa barra para filtrar</span>
        </div>
        <p className="text-muted-foreground text-sm mb-4">{tenants.length} cliente{tenants.length === 1 ? "" : "s"} no total</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={byPlan} margin={{ top: 20, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={{ stroke: "#e5e7eb" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(30,37,53,0.04)" }}
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(v) => [`${Number(v)} cliente${Number(v) === 1 ? "" : "s"}`, "Total"]}
            />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={72}
              label={{ position: "top", fontSize: 12, fill: "#1E2535", fontWeight: 600 }}
              onClick={(data) => {
                const plan = (data as unknown as { plan: PlanKey }).plan;
                setFilter((f) => (f === plan ? "TODOS" : plan));
              }}
              className="cursor-pointer"
            >
              {byPlan.map((d) => (
                <Cell
                  key={d.plan}
                  fill={PLAN_COLORS[d.plan]}
                  opacity={filter === "TODOS" || filter === d.plan ? 1 : 0.25}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filtro por plano */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(["TODOS", "STARTER", "PRO", "ENTERPRISE"] as FilterKey[]).map((key) => {
          const count = key === "TODOS" ? tenants.length : byPlan.find((b) => b.plan === key)?.count ?? 0;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === key
                  ? "bg-grafite text-white border-grafite"
                  : "bg-card text-muted-foreground border-border hover:border-border"
              }`}
            >
              {key === "TODOS" ? "Todos" : PLAN_LABELS[key]}
              <span className={`text-xs px-1.5 rounded-full ${filter === key ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-fundo text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <div className="col-span-4">Cliente</div>
          <div className="col-span-2">Plano</div>
          <div className="col-span-3">Uso</div>
          <div className="col-span-2">Receita/mês</div>
          <div className="col-span-1 text-right">Ação</div>
        </div>
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">Nenhum cliente neste plano.</p>
          ) : (
            filtered.map((t) => {
              const price = effectiveMonthlyPrice(t.plan, t.monthlyPrice);
              const limit = t.maxEventsPerMonth;
              const usagePct = limit > 0 ? Math.min(Math.round((t.eventsThisMonth / limit) * 100), 100) : null;
              return (
                <div key={t.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center">
                  {/* Cliente */}
                  <div className="md:col-span-4 flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-grafite/5 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-foreground" />
                    </div>
                    <span className="text-foreground font-medium text-sm truncate">{t.name}</span>
                  </div>

                  {/* Plano */}
                  <div className="md:col-span-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${PLAN_BADGE[t.plan]}`}>
                      {PLAN_LABELS[t.plan]}
                    </span>
                  </div>

                  {/* Uso: usuários + eventos no mês / limite */}
                  <div className="md:col-span-3 text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1" title="Usuários">
                        <Users className="w-3.5 h-3.5" /> {t.users}
                      </span>
                      <span className="flex items-center gap-1" title="Eventos no mês / limite do plano">
                        <Calendar className="w-3.5 h-3.5" />
                        {t.eventsThisMonth}{limit > 0 ? `/${limit}` : ""} no mês
                      </span>
                    </div>
                    {usagePct !== null ? (
                      <div className="mt-1.5 h-1.5 w-full max-w-[140px] bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${usagePct >= 100 ? "bg-laranja" : "bg-grafite"}`}
                          style={{ width: `${usagePct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">eventos ilimitados · {t.events} no total</p>
                    )}
                  </div>

                  {/* Receita */}
                  <div className="md:col-span-2">
                    {price === null ? (
                      <span className="text-xs font-medium text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                        A definir
                      </span>
                    ) : (
                      <span className={`text-sm font-semibold ${price > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {formatBRL(price)}
                      </span>
                    )}
                  </div>

                  {/* Ação */}
                  <div className="md:col-span-1 md:text-right">
                    <button
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center gap-1.5 text-laranja hover:text-laranja-dark text-sm font-medium transition-colors"
                    >
                      <Settings2 className="w-4 h-4" /> Gerenciar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {editing && (
        <EditDialog
          tenant={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); showToast(msg); }}
        />
      )}
    </>
  );
}

/* ── Modal de provisionamento ────────────────────────── */
function EditDialog({ tenant, onClose, onSaved }: { tenant: AdminTenant; onClose: () => void; onSaved: (msg: string) => void }) {
  const router = useRouter();
  const [plan, setPlan] = useState(tenant.plan);
  const [priceInput, setPriceInput] = useState(tenant.monthlyPrice !== null ? String(tenant.monthlyPrice).replace(".", ",") : "");
  const [maxEvents, setMaxEvents] = useState(String(tenant.maxEventsPerMonth));
  const [maxGuests, setMaxGuests] = useState(String(tenant.maxGuestsPerEvent));
  const [advReports, setAdvReports] = useState(tenant.flagAdvancedReports);
  const [desktopSync, setDesktopSync] = useState(tenant.flagDesktopSync);
  const [apiAccess, setApiAccess] = useState(tenant.flagApiAccess);
  const [apiKey, setApiKey] = useState(tenant.apiKey);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultPrice = effectiveMonthlyPrice(plan, null);

  async function patch(extra: Record<string, unknown>) {
    const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(extra),
    });
    return res.ok ? res.json() : null;
  }

  async function save() {
    setSaving(true);
    setError(null);
    const parsed = priceInput.trim() === ""
      ? null
      : parseFloat(priceInput.replace(/\./g, "").replace(",", "."));
    const result = await patch({
      plan,
      monthlyPrice: parsed !== null && !Number.isNaN(parsed) ? parsed : null,
      maxEventsPerMonth: parseInt(maxEvents) || 0,
      maxGuestsPerEvent: parseInt(maxGuests) || 0,
      flagAdvancedReports: advReports,
      flagDesktopSync: desktopSync,
      flagApiAccess: apiAccess,
    });
    setSaving(false);
    if (!result) {
      setError("Não foi possível salvar as alterações. Tente novamente.");
      return;
    }
    router.refresh();
    onSaved(`${tenant.name} atualizado.`);
  }

  async function generateKey() {
    const data = await patch({ generateApiKey: true });
    if (data?.apiKey) setApiKey(data.apiKey);
  }

  const input = "w-full h-10 px-3 rounded-xl border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-foreground font-bold">{tenant.name}</h3>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          {/* Plano + valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Plano</label>
              <select
                value={plan}
                onChange={(e) => {
                  const p = e.target.value as PlanKey;
                  setPlan(p);
                  // Ao trocar o plano, já aplica limites e recursos padrão dele
                  // (o admin ainda pode ajustar manualmente depois).
                  const d = PLAN_DEFAULTS[p];
                  setMaxEvents(String(d.maxEventsPerMonth));
                  setMaxGuests(String(d.maxGuestsPerEvent));
                  setAdvReports(d.flagAdvancedReports);
                  setDesktopSync(d.flagDesktopSync);
                  setApiAccess(d.flagApiAccess);
                }}
                className={`${input} bg-card`}
              >
                <option className="bg-card text-foreground" value="STARTER">Starter</option>
                <option className="bg-card text-foreground" value="PRO">Pro</option>
                <option className="bg-card text-foreground" value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Valor mensal (R$)
              </label>
              <input
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={defaultPrice !== null ? `padrão: ${defaultPrice}` : "negociado"}
                inputMode="decimal"
                className={input}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Vazio = padrão do plano{plan === "ENTERPRISE" ? " (Enterprise: defina o valor negociado)" : ""}</p>
            </div>
          </div>

          {/* Limites */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Máx. eventos/mês <span className="text-muted-foreground font-normal">(0=ilimitado)</span></label>
              <input type="number" min={0} value={maxEvents} onChange={(e) => setMaxEvents(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Máx. convidados <span className="text-muted-foreground font-normal">(0=ilimitado)</span></label>
              <input type="number" min={0} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className={input} />
            </div>
          </div>

          {/* Flags */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Recursos liberados</p>
            <div className="space-y-2">
              {[
                { label: "Relatórios avançados", value: advReports, set: setAdvReports },
                { label: "Sincronização do app desktop", value: desktopSync, set: setDesktopSync },
                { label: "Acesso à API", value: apiAccess, set: setApiAccess },
              ].map((f) => (
                <label key={f.label} className="flex items-center gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={f.value} onChange={(e) => f.set(e.target.checked)} className="w-4 h-4 rounded border-border accent-laranja cursor-pointer" />
                  <span className="text-sm text-foreground">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Chave de API */}
          <div className="bg-fundo/50 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-laranja" />
              <span className="text-sm font-medium text-foreground">Chave de API (Enterprise)</span>
            </div>
            {apiKey ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground font-mono truncate">{apiKey}</code>
                <button
                  onClick={() => { navigator.clipboard?.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copiar"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button onClick={generateKey} className="text-laranja hover:text-laranja-dark text-sm font-medium transition-colors">
                + Gerar chave de API
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-fundo/30">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:border-border transition-colors">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
