"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Plus, Download, UserPlus, X, Mail, LogIn, Undo2,
  Check, Ban, RotateCcw, Users, Clock, MapPin, Loader2,
} from "lucide-react";
import { type EventItem } from "@/lib/mockEvents";
import {
  fetchConfirmations, fetchCheckins, addGuest as addGuestApi,
  updateConfirmationStatus, scanCheckin, undoCheckin as undoCheckinApi,
  resendInvite as resendInviteApi,
  type Confirmation, type CheckinRecord,
} from "@/lib/eventData";

type DisplayStatus = "presente" | "confirmado" | "lista_espera" | "cancelado";
type FilterKey = "todos" | DisplayStatus;

interface GuestRow {
  confirmation: Confirmation;
  checkin?: CheckinRecord;
  display: DisplayStatus;
}

const STATUS_BADGE: Record<DisplayStatus, { label: string; className: string }> = {
  presente:     { label: "Presente",        className: "bg-green-100 text-green-700 border-green-200" },
  confirmado:   { label: "Confirmado",      className: "bg-blue-100 text-blue-700 border-blue-200" },
  lista_espera: { label: "Lista de espera", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  cancelado:    { label: "Cancelado",       className: "bg-muted text-muted-foreground border-border" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "presente", label: "Presentes" },
  { key: "confirmado", label: "Confirmados" },
  { key: "lista_espera", label: "Lista de espera" },
  { key: "cancelado", label: "Cancelados" },
];

export default function GuestsView({ event, liveTick = 0 }: { event: EventItem; liveTick?: number }) {
  const [rows, setRows] = useState<GuestRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    const [confs, checks] = await Promise.all([
      fetchConfirmations(event.id),
      fetchCheckins(event.id),
    ]);
    const checkByToken = new Map(checks.map((c) => [c.token, c]));
    const list: GuestRow[] = confs.map((c) => {
      const checkin = checkByToken.get(c.id);
      let display: DisplayStatus;
      if (c.status === "cancelado") display = "cancelado";
      else if (checkin) display = "presente";
      else if (c.status === "lista_espera") display = "lista_espera";
      else display = "confirmado";
      return { confirmation: c, checkin, display };
    });
    setRows(list);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [event.id, liveTick]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  /* ── Ações ─────────────────────────────────────── */
  async function manualCheckin(g: GuestRow) {
    await scanCheckin(event.id, g.confirmation.id, "Manual");
    showToast(`Check-in manual de ${g.confirmation.name} registrado.`);
    load();
  }

  async function undoCheckin(g: GuestRow) {
    await undoCheckinApi(event.id, g.confirmation.id);
    showToast(`Check-in de ${g.confirmation.name} desfeito.`);
    load();
  }

  async function setStatus(g: GuestRow, status: Confirmation["status"], msg: string) {
    await updateConfirmationStatus(g.confirmation.id, status);
    showToast(msg);
    load();
  }

  async function resendInvite(g: GuestRow) {
    const r = await resendInviteApi(g.confirmation.id);
    if (r.ok) {
      showToast(
        r.skipped
          ? `Convite registrado (dev — sem envio real de e-mail).`
          : `Convite reenviado para ${g.confirmation.email}.`,
      );
    } else {
      showToast(r.error ?? "Não foi possível reenviar o convite.");
    }
  }

  async function addGuest(name: string, email: string) {
    const r = await addGuestApi(event.id, { name: name.trim(), email: email.trim() });
    setAddOpen(false);
    if (r.ok) {
      showToast(`${name.trim()} adicionado à lista de convidados.`);
      load();
    } else {
      showToast(r.error ?? "Não foi possível adicionar o convidado.");
    }
  }

  /* ── Exportar CSV (abre no Excel) ──────────────── */
  function exportCsv() {
    const header = ["Nome", "E-mail", "Status", "Check-in", "Terminal"];
    const lines = rows.map((g) => [
      g.confirmation.name,
      g.confirmation.email,
      STATUS_BADGE[g.display].label,
      g.checkin ? new Date(g.checkin.checkedInAt).toLocaleString("pt-BR") : "",
      g.checkin?.terminal ?? "",
    ]);
    const csv = [header, ...lines]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convidados_${event.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Filtro + busca ────────────────────────────── */
  const filtered = useMemo(() => {
    return rows.filter((g) => {
      const matchFilter = filter === "todos" || g.display === filter;
      const q = query.trim().toLowerCase();
      const matchQuery =
        q === "" ||
        g.confirmation.name.toLowerCase().includes(q) ||
        g.confirmation.email.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [rows, filter, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { todos: rows.length };
    for (const g of rows) map[g.display] = (map[g.display] ?? 0) + 1;
    return map;
  }, [rows]);

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-grafite text-white text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Convidados</h2>
          <p className="text-muted-foreground text-sm">
            {rows.length} {rows.length === 1 ? "pessoa" : "pessoas"} na lista
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 border border-border hover:border-border disabled:opacity-50 text-foreground px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 bg-laranja hover:bg-laranja-dark text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <UserPlus className="w-4 h-4" /> Adicionar convidado
          </button>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-card text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.key
                ? "bg-grafite text-white border-grafite"
                : "bg-card text-muted-foreground border-border hover:border-border"
            }`}
          >
            {f.label}
            {counts[f.key] != null && (
              <span className={`text-xs px-1.5 rounded-full ${filter === f.key ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-foreground font-semibold text-base mb-1">
            {rows.length === 0 ? "Nenhum convidado ainda" : "Nenhum resultado"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {rows.length === 0
              ? "Compartilhe o link de confirmação ou adicione convidados manualmente."
              : "Ajuste a busca ou os filtros para encontrar convidados."}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Header da tabela (desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border bg-fundo text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Convidado</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Check-in</div>
            <div className="col-span-3 text-right">Ações</div>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((g) => (
              <GuestRowItem
                key={g.confirmation.id}
                guest={g}
                onCheckin={() => manualCheckin(g)}
                onUndoCheckin={() => undoCheckin(g)}
                onConfirm={() => setStatus(g, "confirmado", `${g.confirmation.name} confirmado.`)}
                onCancel={() => setStatus(g, "cancelado", `${g.confirmation.name} cancelado.`)}
                onReactivate={() => setStatus(g, "confirmado", `${g.confirmation.name} reativado.`)}
                onResend={() => resendInvite(g)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal adicionar convidado */}
      {addOpen && <AddGuestDialog onAdd={addGuest} onClose={() => setAddOpen(false)} />}
    </div>
  );
}

/* ── Linha de convidado ──────────────────────────────── */
function GuestRowItem({
  guest, onCheckin, onUndoCheckin, onConfirm, onCancel, onReactivate, onResend,
}: {
  guest: GuestRow;
  onCheckin: () => void;
  onUndoCheckin: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReactivate: () => void;
  onResend: () => void;
}) {
  const { confirmation: c, checkin, display } = guest;
  const badge = STATUS_BADGE[display];
  const initials = c.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-5 py-4 items-center hover:bg-fundo/40 transition-colors">
      {/* Convidado */}
      <div className="md:col-span-4 flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-grafite/5 flex items-center justify-center flex-shrink-0">
          <span className="text-foreground text-xs font-bold">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-foreground font-medium text-sm truncate">{c.name}</p>
          <p className="text-muted-foreground text-xs truncate">{c.email}</p>
        </div>
      </div>

      {/* Status */}
      <div className="md:col-span-2">
        <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Check-in */}
      <div className="md:col-span-3 text-sm text-muted-foreground">
        {checkin ? (
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {new Date(checkin.checkedInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" /> {checkin.terminal}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Ações */}
      <div className="md:col-span-3 flex items-center md:justify-end gap-1">
        {display === "confirmado" && (
          <ActionBtn icon={LogIn} label="Check-in manual" onClick={onCheckin} primary />
        )}
        {display === "lista_espera" && (
          <ActionBtn icon={Check} label="Confirmar" onClick={onConfirm} primary />
        )}
        {display === "presente" && (
          <ActionBtn icon={Undo2} label="Desfazer check-in" onClick={onUndoCheckin} />
        )}
        {display === "cancelado" && (
          <ActionBtn icon={RotateCcw} label="Reativar" onClick={onReactivate} primary />
        )}
        {display !== "cancelado" && (
          <ActionBtn icon={Mail} label="Reenviar convite" onClick={onResend} />
        )}
        {(display === "confirmado" || display === "lista_espera" || display === "presente") && (
          <ActionBtn icon={Ban} label="Cancelar" onClick={onCancel} danger />
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, primary, danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
        primary
          ? "text-laranja hover:bg-laranja/10"
          : danger
          ? "text-muted-foreground hover:text-red-500 hover:bg-red-50"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/* ── Modal: adicionar convidado ──────────────────────── */
function AddGuestDialog({
  onAdd, onClose,
}: {
  onAdd: (name: string, email: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: typeof errors = {};
    if (!name.trim()) er.name = "Informe o nome";
    if (!email.trim()) er.email = "Informe o e-mail";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) er.email = "E-mail inválido";
    setErrors(er);
    if (Object.keys(er).length > 0) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    onAdd(name, email);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={submit}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-foreground font-bold">Adicionar convidado</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-muted-foreground text-sm">
            O convidado será adicionado como <span className="font-semibold text-foreground">confirmado</span> e contará como uma vaga ocupada.
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nome completo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do convidado"
              className={`w-full h-11 px-4 rounded-xl border text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-laranja/20 focus:border-laranja ${errors.name ? "border-red-400" : "border-border"}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@convidado.com"
              className={`w-full h-11 px-4 rounded-xl border text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-laranja/20 focus:border-laranja ${errors.email ? "border-red-400" : "border-border"}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-fundo/30">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:border-border transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white text-sm font-semibold transition-colors">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adicionando...</> : <><Plus className="w-4 h-4" /> Adicionar</>}
          </button>
        </div>
      </form>
    </div>
  );
}
