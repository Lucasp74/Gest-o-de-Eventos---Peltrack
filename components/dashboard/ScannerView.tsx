"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera, Usb, ScanLine, CheckCircle2, AlertTriangle, XCircle,
  UserCheck, ArrowLeft, Loader2, LogIn, LogOut, Settings2,
  Plus, Pencil, Trash2, X, Check,
} from "lucide-react";
import { type EventItem } from "@/lib/mockEvents";
import { fetchCheckins, fetchTerminals, saveTerminals, scanCheckin } from "@/lib/eventData";

type Mode = "idle" | "camera" | "usb";
type FeedbackKind = "success" | "duplicate" | "not_found";

interface Feedback {
  kind: FeedbackKind;
  title: string;
  subtitle: string;
  time: string;
}

export default function ScannerView({ event, liveTick = 0 }: { event: EventItem; liveTick?: number }) {
  const [mode, setMode] = useState<Mode>("idle");
  // Check-out: estrutura prevista no checkinStore (checkedOutAt); fluxo atual usa somente check-in
  const [terminals, setTerminals] = useState<string[]>([]);
  const [terminal, setTerminal] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [presentCount, setPresentCount] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);

  const usbInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Terminais: carrega uma vez por evento (não resetar a seleção do operador).
  useEffect(() => {
    fetchTerminals(event.id).then((list) => {
      setTerminals(list);
      setTerminal(list[0]);
    });
  }, [event.id]);

  // Contador de presentes: recarrega a cada mudança em tempo real (todos os guichês).
  useEffect(() => {
    fetchCheckins(event.id).then((c) => setPresentCount(c.length));
  }, [event.id, liveTick]);

  async function handleSaveTerminals(list: string[]) {
    const saved = await saveTerminals(event.id, list);
    setTerminals(saved);
    // mantém a seleção se o terminal ainda existir; senão usa o primeiro
    if (!saved.includes(terminal)) setTerminal(saved[0]);
    setManageOpen(false);
  }

  /* ── Processa um token lido (câmera ou USB) ─────────── */
  const processToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token) return;

      // Debounce: a câmera lê o mesmo QR várias vezes por segundo
      const now = Date.now();
      if (lastScanRef.current.token === token && now - lastScanRef.current.at < 3000) {
        return;
      }
      lastScanRef.current = { token, at: now };

      const time = new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      // O servidor valida e registra o check-in (anti-fraude)
      const res = await scanCheckin(event.id, token, terminal);

      if (res.result === "not_found") {
        showFeedback({
          kind: "not_found",
          title: "Convite não encontrado",
          subtitle: `Código lido: ${token.slice(0, 13)}…`,
          time,
        });
      } else if (res.result === "duplicate") {
        const usedAt = res.usedAt
          ? new Date(res.usedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : "";
        showFeedback({
          kind: "duplicate",
          title: res.name ?? "Convite",
          subtitle: `⚠ Este convite JÁ FOI USADO às ${usedAt} (${res.terminal})`,
          time,
        });
      } else {
        setPresentCount((c) => c + 1);
        showFeedback({
          kind: "success",
          title: res.name ?? "Convidado",
          subtitle: "Acesso liberado — bem-vindo(a)!",
          time,
        });
      }
    },
    [event.id, terminal],
  );

  function showFeedback(f: Feedback) {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback(f);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }

  /* ── Câmera ──────────────────────────────────────────── */
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* já parada */ }
      scannerRef.current = null;
    }
  }, []);

  async function startCamera() {
    setCameraError(null);
    setCameraStarting(true);
    setMode("camera");
    // espera o elemento #qr-reader montar
    await new Promise((r) => setTimeout(r, 50));
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" }, // câmera traseira no celular
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decodedText) => processToken(decodedText),
        () => { /* erros de leitura por frame — ignorar */ },
      );
    } catch {
      setCameraError(
        "Não foi possível acessar a câmera. Verifique a permissão do navegador ou use o leitor USB.",
      );
      setMode("idle");
    } finally {
      setCameraStarting(false);
    }
  }

  /* ── USB: manter foco no campo (igual ao app desktop) ── */
  useEffect(() => {
    if (mode !== "usb") return;
    usbInputRef.current?.focus();
    const interval = setInterval(() => {
      if (document.activeElement !== usbInputRef.current) {
        usbInputRef.current?.focus();
      }
    }, 400);
    return () => clearInterval(interval);
  }, [mode]);

  /* Cleanup ao desmontar */
  useEffect(() => {
    return () => {
      stopCamera();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [stopCamera]);

  async function backToIdle() {
    await stopCamera();
    setMode("idle");
    setFeedback(null);
  }

  function handleUsbKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const value = (e.target as HTMLInputElement).value;
      (e.target as HTMLInputElement).value = "";
      processToken(value);
    }
  }

  /* ════════════ RENDER ════════════ */

  return (
    <div className="space-y-6">
      {/* Barra superior: direção + terminal + contador */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Direção (check-in / check-out futuro) */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Operação</p>
          <div className="flex gap-2">
            <span className="flex-1 flex items-center justify-center gap-1.5 bg-laranja text-white text-sm font-semibold py-2 rounded-xl">
              <LogIn className="w-4 h-4" /> Check-in
            </span>
            <span
              title="Check-out será habilitado em breve"
              className="flex-1 flex items-center justify-center gap-1.5 bg-muted text-muted-foreground text-sm font-semibold py-2 rounded-xl border border-border cursor-not-allowed select-none"
            >
              <LogOut className="w-4 h-4" /> Check-out
            </span>
          </div>
        </div>

        {/* Terminal */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Terminal</p>
          <div className="flex gap-2">
            <select
              value={terminal}
              onChange={(e) => setTerminal(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja"
            >
              {terminals.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={() => setManageOpen(true)}
              title="Gerenciar terminais"
              aria-label="Gerenciar terminais"
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-laranja hover:text-laranja transition-colors flex-shrink-0"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contador */}
        <div className="bg-grafite rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Presentes</p>
            <p className="text-white text-3xl font-bold leading-none">{presentCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-laranja/15 border border-laranja/20 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-laranja" />
          </div>
        </div>
      </div>

      {/* Painel de feedback */}
      <FeedbackPanel feedback={feedback} />

      {/* Área principal */}
      {mode === "idle" && (
        <div className="bg-card rounded-2xl border border-border p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-laranja/10 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-7 h-7 text-laranja" />
            </div>
            <h2 className="text-foreground font-bold text-lg">Como você vai ler os QR Codes?</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Escolha o método de leitura para iniciar o check-in.
            </p>
          </div>

          {cameraError && (
            <div role="alert" className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6 max-w-lg mx-auto">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {cameraError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <button
              onClick={startCamera}
              className="group p-6 rounded-2xl border-2 border-border hover:border-laranja hover:bg-laranja/5 transition-all text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-fundo group-hover:bg-laranja/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Camera className="w-6 h-6 text-laranja" />
              </div>
              <p className="text-foreground font-semibold text-sm">Câmera</p>
              <p className="text-muted-foreground text-xs mt-1">
                Celular ou webcam — aponte para o QR Code do convidado
              </p>
            </button>

            <button
              onClick={() => setMode("usb")}
              className="group p-6 rounded-2xl border-2 border-border hover:border-laranja hover:bg-laranja/5 transition-all text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-fundo group-hover:bg-laranja/10 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Usb className="w-6 h-6 text-laranja" />
              </div>
              <p className="text-foreground font-semibold text-sm">Leitor USB</p>
              <p className="text-muted-foreground text-xs mt-1">
                Leitor de QR Code conectado ao notebook ou desktop
              </p>
            </button>
          </div>
        </div>
      )}

      {mode === "camera" && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4 text-laranja" /> Leitura pela câmera
            </h2>
            <button
              onClick={backToIdle}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Trocar método
            </button>
          </div>

          <div className="max-w-sm mx-auto">
            {cameraStarting && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-12">
                <Loader2 className="w-4 h-4 animate-spin" /> Iniciando câmera...
              </div>
            )}
            <div id="qr-reader" className="rounded-xl overflow-hidden [&_video]:rounded-xl" />
            <p className="text-muted-foreground text-xs text-center mt-3">
              Posicione o QR Code do convidado dentro da área de leitura
            </p>
          </div>
        </div>
      )}

      {mode === "usb" && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground font-semibold flex items-center gap-2">
              <Usb className="w-4 h-4 text-laranja" /> Leitura por leitor USB
            </h2>
            <button
              onClick={backToIdle}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Trocar método
            </button>
          </div>

          <div className="max-w-md mx-auto py-6">
            <input
              ref={usbInputRef}
              onKeyDown={handleUsbKeyDown}
              placeholder="Aguardando leitura do leitor..."
              autoComplete="off"
              className="w-full h-14 px-4 text-center text-base rounded-xl border-2 border-laranja/40 bg-fundo/30 text-foreground outline-none placeholder:text-muted-foreground focus:border-laranja focus:ring-4 focus:ring-laranja/10 transition-all"
            />
            <p className="text-muted-foreground text-xs text-center mt-3">
              O campo permanece focado automaticamente — basta passar o convite no leitor.
              Também é possível digitar o código e pressionar Enter.
            </p>
          </div>
        </div>
      )}
      {/* Modal de gerenciamento de terminais */}
      {manageOpen && (
        <TerminalsDialog
          terminals={terminals}
          onSave={handleSaveTerminals}
          onClose={() => setManageOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Diálogo: gerenciar terminais (add / renomear / remover) ── */
function TerminalsDialog({
  terminals, onSave, onClose,
}: {
  terminals: string[];
  onSave: (list: string[]) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<string[]>(terminals);
  const [newName, setNewName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const name = newName.trim();
    if (!name) return;
    if (list.some((t) => t.toLowerCase() === name.toLowerCase())) {
      setError(`O terminal "${name}" já existe na lista.`);
      return;
    }
    setError(null);
    setList((l) => [...l, name]);
    setNewName("");
  }

  function startRename(i: number) {
    setEditingIndex(i);
    setEditingValue(list[i]);
    setError(null);
  }

  function confirmRename() {
    if (editingIndex === null) return;
    const name = editingValue.trim();
    if (!name) return;
    const duplicate = list.some(
      (t, i) => i !== editingIndex && t.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      setError(`O terminal "${name}" já existe na lista.`);
      return;
    }
    setError(null);
    setList((l) => l.map((t, i) => (i === editingIndex ? name : t)));
    setEditingIndex(null);
  }

  function remove(i: number) {
    if (list.length === 1) {
      setError("É necessário manter ao menos 1 terminal na lista.");
      return;
    }
    setError(null);
    setList((l) => l.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gerenciar terminais"
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-foreground font-bold">Gerenciar terminais</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div role="alert" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-3.5 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Adicionar */}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Nome do novo terminal (ex: Entrada VIP)"
              className="flex-1 h-10 px-3.5 rounded-xl border border-border text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all"
            />
            <button
              onClick={add}
              className="flex items-center gap-1.5 bg-laranja hover:bg-laranja-dark text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>

          {/* Lista */}
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {list.map((t, i) => (
              <li
                key={`${t}-${i}`}
                className="flex items-center gap-2 bg-fundo/50 border border-border rounded-xl px-3.5 py-2.5"
              >
                {editingIndex === i ? (
                  <>
                    <input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename();
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      autoFocus
                      className="flex-1 h-8 px-2.5 rounded-lg border border-laranja text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20"
                    />
                    <button
                      onClick={confirmRename}
                      aria-label="Confirmar nome"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-foreground font-medium">{t}</span>
                    <button
                      onClick={() => startRename(i)}
                      aria-label={`Renomear ${t}`}
                      title="Renomear"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(i)}
                      aria-label={`Remover ${t}`}
                      title="Remover"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border bg-fundo/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium hover:border-border transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(list)}
            className="px-4 py-2 rounded-xl bg-laranja hover:bg-laranja-dark text-white text-sm font-semibold transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Painel de feedback (verde / amarelo / vermelho) ──── */
function FeedbackPanel({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 min-h-[88px]">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <ScanLine className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">Aguardando leitura…</p>
          <p className="text-muted-foreground text-xs mt-0.5">O resultado do scan aparece aqui</p>
        </div>
      </div>
    );
  }

  const styles: Record<FeedbackKind, { bg: string; iconBg: string; icon: React.ReactNode; text: string }> = {
    success: {
      bg: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
      text: "text-green-700",
    },
    duplicate: {
      bg: "bg-yellow-50 border-yellow-300",
      iconBg: "bg-yellow-100",
      icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
      text: "text-yellow-700",
    },
    not_found: {
      bg: "bg-red-50 border-red-200",
      iconBg: "bg-red-100",
      icon: <XCircle className="w-6 h-6 text-red-600" />,
      text: "text-red-700",
    },
  };

  const s = styles[feedback.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border-2 p-5 flex items-center gap-4 min-h-[88px] ${s.bg}`}
    >
      <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
        {s.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground font-bold text-lg leading-tight truncate">{feedback.title}</p>
        <p className={`text-sm mt-0.5 font-medium ${s.text}`}>{feedback.subtitle}</p>
      </div>
      <span className="text-muted-foreground text-sm font-mono flex-shrink-0">{feedback.time}</span>
    </div>
  );
}
