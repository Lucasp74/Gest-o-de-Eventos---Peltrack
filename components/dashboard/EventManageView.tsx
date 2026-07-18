"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, LayoutDashboard, Users, Link as LinkIcon, ScanLine,
  Ticket, BarChart3, Settings, Calendar, MapPin, Pencil, Copy,
  Check, CheckCircle2, UserCheck, Clock, TrendingUp, Share2,
  Download, ChevronRight, Construction,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  STATUS_META, type EventItem,
} from "@/lib/mockEvents";
import { useEventRealtime } from "@/lib/pusherClient";
import { ExternalLink } from "lucide-react";
import ScannerView from "@/components/dashboard/ScannerView";
import GuestsView from "@/components/dashboard/GuestsView";
import SettingsView from "@/components/dashboard/SettingsView";
import ReportsView from "@/components/dashboard/ReportsView";
import TicketsView from "@/components/dashboard/TicketsView";

type TabId =
  | "overview" | "guests" | "link" | "scanner"
  | "tickets" | "reports" | "settings";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "guests", label: "Convidados", icon: Users },
  { id: "link", label: "Link de confirmação", icon: LinkIcon },
  { id: "scanner", label: "Scanner", icon: ScanLine },
  { id: "tickets", label: "Ingressos", icon: Ticket },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "settings", label: "Configurações", icon: Settings },
];

export default function EventManageView({ id }: { id: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventItem | null | undefined>(undefined);
  const [tab, setTab] = useState<TabId>("overview");
  const [copied, setCopied] = useState(false);
  // Incrementa a cada mudança em tempo real — usado pelas abas para recarregar
  const [liveTick, setLiveTick] = useState(0);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      setEvent(res.ok ? await res.json() : null);
    } catch {
      setEvent(null);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // Tempo real: ao receber um aviso do Pusher, recarrega o evento (contadores da
  // Visão geral) e sinaliza as abas (Convidados/Scanner/Relatórios) via liveTick.
  useEventRealtime(id, useCallback(() => {
    reload();
    setLiveTick((t) => t + 1);
  }, [reload]));

  function copyLink() {
    const link = `${window.location.origin}/e/${id}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* Loading */
  if (event === undefined) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  /* Não encontrado */
  if (event === null) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-7 h-7 text-muted-foreground" />
        </div>
        <h2 className="text-foreground font-semibold text-lg mb-1">Evento não encontrado</h2>
        <p className="text-muted-foreground text-sm mb-6">
          O evento que você procura não existe ou foi removido.
        </p>
        <button
          onClick={() => router.push("/dashboard/eventos")}
          className="inline-flex items-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Meus eventos
        </button>
      </div>
    );
  }

  const meta = STATUS_META[event.status];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Voltar */}
      <button
        onClick={() => router.push("/dashboard/eventos")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Meus eventos
      </button>

      {/* Cabeçalho */}
      <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex gap-4">
            {/* Mini capa */}
            <div className="hidden sm:flex w-16 h-16 rounded-xl bg-grafite flex-shrink-0 items-center justify-center">
              <Calendar className="w-7 h-7 text-laranja" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${meta.className}`}>
                  {meta.label}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                {event.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-muted-foreground text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> {event.dateLabel} · {event.time}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {event.local}
                </span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 border border-border hover:border-border text-foreground px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              {copied ? (
                <><Check className="w-4 h-4 text-green-600" /> Copiado!</>
              ) : (
                <><Copy className="w-4 h-4" /> Copiar link</>
              )}
            </button>
            <button
              onClick={() => setTab("settings")}
              className="flex items-center gap-1.5 bg-grafite hover:bg-grafite-light text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Pencil className="w-4 h-4" /> Editar
            </button>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? "border-laranja text-laranja"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {tab === "overview" ? (
        <OverviewTab event={event} onCopyLink={copyLink} copied={copied} onTab={setTab} />
      ) : tab === "guests" ? (
        <GuestsView event={event} liveTick={liveTick} />
      ) : tab === "link" ? (
        <LinkTab event={event} />
      ) : tab === "scanner" ? (
        <ScannerView event={event} liveTick={liveTick} />
      ) : tab === "settings" ? (
        <SettingsView event={event} onUpdated={reload} />
      ) : tab === "reports" ? (
        <ReportsView event={event} liveTick={liveTick} />
      ) : tab === "tickets" ? (
        <TicketsView event={event} />
      ) : (
        <ComingSoon label={TABS.find((t) => t.id === tab)?.label ?? ""} />
      )}
    </div>
  );
}

/* ── Aba: Visão geral ────────────────────────────────── */
function OverviewTab({
  event, onCopyLink, copied, onTab,
}: {
  event: EventItem;
  onCopyLink: () => void;
  copied: boolean;
  onTab: (t: TabId) => void;
}) {
  const occupancy = event.capacity > 0 ? Math.round((event.confirmed / event.capacity) * 100) : 0;
  const attendance = event.confirmed > 0 ? Math.round((event.checkedIn / event.confirmed) * 100) : 0;
  const remaining = event.capacity > 0 ? Math.max(event.capacity - event.confirmed, 0) : null;

  const stats = [
    { label: "Confirmados", value: event.confirmed, icon: CheckCircle2 },
    { label: "Presentes", value: event.checkedIn, icon: UserCheck, accent: true },
    {
      label: "Vagas restantes",
      value: remaining === null ? "—" : remaining,
      icon: Users,
    },
    { label: "Comparecimento", value: `${attendance}%`, icon: TrendingUp },
  ];

  // Mock — confirmações nos últimos 7 dias (substituir por dados reais)
  const weekly = useMemo(() => {
    const base = Math.max(event.confirmed, 7);
    const dist = [0.05, 0.08, 0.12, 0.18, 0.22, 0.15, 0.2];
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
    return days.map((d, i) => ({ day: d, value: Math.round(base * dist[i]) }));
  }, [event.confirmed]);
  const weeklyMax = Math.max(...weekly.map((w) => w.value), 1);

  // Mock — atividade recente
  const activity = [
    { name: "Mariana Fernandes", action: "confirmou presença", time: "há 2 min" },
    { name: "Carlos Eduardo", action: "fez check-in", time: "há 8 min" },
    { name: "Ana Paula Santos", action: "confirmou presença", time: "há 15 min" },
    { name: "Ricardo Lima", action: "fez check-in", time: "há 23 min" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 border border-border">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.accent ? "bg-laranja/10" : "bg-grafite/5"}`}>
              <s.icon className={`w-5 h-5 ${s.accent ? "text-laranja" : "text-foreground"}`} />
            </div>
            <p className={`text-2xl font-bold ${s.accent ? "text-laranja" : "text-foreground"}`}>{s.value}</p>
            <p className="text-muted-foreground text-sm mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ocupação */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Ocupação do evento</h3>
              <span className="text-sm font-semibold text-foreground">
                {event.confirmed}/{event.capacity > 0 ? event.capacity : "∞"}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${occupancy >= 100 ? "bg-laranja" : "bg-grafite"}`}
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {event.capacity > 0
                ? `${occupancy}% das vagas preenchidas`
                : "Capacidade ilimitada"}
            </p>
          </div>

          {/* Gráfico semanal */}
          <div className="bg-card rounded-2xl p-6 border border-border">
            <h3 className="text-foreground font-semibold mb-1">Confirmações na semana</h3>
            <p className="text-muted-foreground text-sm mb-6">Novas confirmações por dia</p>
            <div className="flex items-end gap-3 h-40">
              {weekly.map((w) => (
                <div key={w.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-laranja/20 hover:bg-laranja/40 transition-colors relative group"
                      style={{ height: `${(w.value / weeklyMax) * 100}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {w.value}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{w.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Ações rápidas */}
          <div className="bg-card rounded-2xl p-5 border border-border">
            <h3 className="text-foreground font-semibold mb-4">Ações rápidas</h3>
            <div className="space-y-2">
              <QuickAction
                icon={copied ? Check : Share2}
                label={copied ? "Link copiado!" : "Compartilhar link"}
                onClick={onCopyLink}
              />
              <QuickAction icon={ScanLine} label="Abrir scanner" onClick={() => onTab("scanner")} />
              <QuickAction icon={Users} label="Ver convidados" onClick={() => onTab("guests")} />
              <QuickAction icon={Download} label="Exportar lista" onClick={() => onTab("reports")} />
            </div>
          </div>

          {/* Atividade */}
          <div className="bg-card rounded-2xl border border-border">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-foreground font-semibold">Atividade recente</h3>
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Ao vivo
              </span>
            </div>
            <div className="divide-y divide-border">
              {activity.map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-grafite/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-foreground text-xs font-bold">
                      {a.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm leading-snug">
                      <span className="font-semibold">{a.name}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-3.5 py-3 rounded-xl border border-border hover:border-laranja/30 hover:bg-laranja/5 transition-colors group"
    >
      <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
        <Icon className="w-4 h-4 text-laranja" />
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-laranja transition-colors" />
    </button>
  );
}

/* ── Aba: Link de confirmação ────────────────────────── */
function LinkTab({ event }: { event: EventItem }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/e/${event.id}`;
  const totalConfirmed = event.confirmed;
  const remaining = event.capacity > 0 ? Math.max(event.capacity - totalConfirmed, 0) : null;

  function copy() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Link + instruções */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-foreground font-semibold mb-1">Link público de confirmação</h3>
          <p className="text-muted-foreground text-sm mb-5">
            Compartilhe este link com seus convidados. Ao confirmarem presença, recebem um QR Code único por e-mail.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center h-11 px-4 rounded-xl border border-border bg-fundo/50 text-sm text-foreground font-mono truncate">
              {link || "carregando..."}
            </div>
            <button
              onClick={copy}
              className="flex items-center justify-center gap-1.5 bg-laranja hover:bg-laranja-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {copied ? <><Check className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar</>}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 border border-border hover:border-border text-foreground px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Abrir
            </a>
          </div>
        </div>

        {/* Como funciona */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-foreground font-semibold mb-4">Como funciona</h3>
          <ol className="space-y-4">
            {[
              "Você compartilha o link (ou QR Code ao lado) com os convidados.",
              "O convidado abre o link, preenche nome e e-mail e confirma presença.",
              "O sistema gera um QR Code único e envia o convite por e-mail.",
              "No dia do evento, você lê o QR Code no scanner para validar a entrada.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-laranja/10 text-laranja text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted-foreground text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* QR do link + status */}
      <div className="space-y-6">
        <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center text-center">
          <h3 className="text-foreground font-semibold mb-4 self-start">QR Code do link</h3>
          <div className="bg-white p-3 rounded-2xl border-2 border-border">
            {origin ? (
              <QRCodeSVG value={link} size={150} level="M" fgColor="#1E2535" />
            ) : (
              <div className="w-[150px] h-[150px] bg-muted animate-pulse rounded" />
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-3">
            Escaneie para abrir a página de confirmação
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-foreground font-semibold mb-3 text-sm">Status das vagas</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Confirmados</span>
              <span className="font-semibold text-foreground">{totalConfirmed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacidade</span>
              <span className="font-semibold text-foreground">
                {event.capacity > 0 ? event.capacity : "Ilimitada"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vagas restantes</span>
              <span className={`font-semibold ${remaining === 0 ? "text-laranja" : "text-foreground"}`}>
                {remaining === null ? "—" : remaining}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Placeholder para abas não construídas ───────────── */
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="bg-card rounded-2xl border border-dashed border-border py-20 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
        <Construction className="w-7 h-7 text-laranja" />
      </div>
      <h3 className="text-foreground font-semibold text-base mb-1">{label}</h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        Esta aba está em construção. Em breve estará disponível aqui.
      </p>
    </div>
  );
}
