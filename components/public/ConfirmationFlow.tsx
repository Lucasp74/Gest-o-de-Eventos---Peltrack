"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Zap, Calendar, MapPin, Users, CheckCircle2, Mail, Loader2,
  PartyPopper, Clock, AlertCircle, Download, CalendarClock, CalendarX,
} from "lucide-react";
import { type EventItem } from "@/lib/mockEvents";
import { fetchPublicEvent, confirmPresence, type Confirmation } from "@/lib/eventData";
import PaidPurchaseFlow from "@/components/public/PaidPurchaseFlow";

export default function ConfirmationFlow({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventItem | null | undefined>(undefined);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<Confirmation | null>(null);

  useEffect(() => {
    fetchPublicEvent(eventId).then((e) => setEvent(e));
  }, [eventId]);

  const capacity = event?.capacity ?? 0;
  const totalConfirmed = event?.confirmed ?? 0;
  const remaining = capacity > 0 ? Math.max(capacity - totalConfirmed, 0) : null;
  const isFull = remaining !== null && remaining <= 0;

  // Janela de inscrições (opcional)
  const now = Date.now();
  const opensAt = event?.registrationOpensAt ? new Date(event.registrationOpensAt).getTime() : null;
  const closesAt = event?.registrationClosesAt ? new Date(event.registrationClosesAt).getTime() : null;
  const regNotOpen = opensAt !== null && now < opensAt;
  const regClosed = closesAt !== null && now > closesAt;

  function formatWindow(value: string) {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Informe seu nome";
    if (!email.trim()) e.email = "Informe seu e-mail";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setNotice(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (regNotOpen || regClosed) {
      setNotice("As inscrições não estão abertas no momento.");
      return;
    }

    setSubmitting(true);
    // O servidor decide confirmado × lista de espera e impede e-mail duplicado.
    // (Envio real do e-mail com o QR entra na Semana 3 — Resend + qrcode.)
    const res = await confirmPresence(eventId, { name: name.trim(), email: email.trim() });
    setSubmitting(false);

    if (res.ok && res.confirmation) {
      setResult(res.confirmation);
    } else if (res.code === "ALREADY") {
      setNotice("Este e-mail já confirmou presença neste evento.");
    } else {
      setNotice(res.error ?? "Não foi possível confirmar. Tente novamente.");
    }
  }

  /* Loading */
  if (event === undefined) {
    return (
      <div className="min-h-screen bg-fundo flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-laranja animate-spin" />
      </div>
    );
  }

  /* Evento não encontrado */
  if (event === null) {
    return (
      <div className="min-h-screen bg-fundo flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-grafite font-bold text-lg">Evento não encontrado</h1>
          <p className="text-grafite-muted text-sm mt-1">
            O link pode estar incorreto ou o evento foi removido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fundo">
      {/* Brand bar */}
      <header className="bg-grafite">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-laranja flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          <span className="text-white font-bold text-base">
            Pel<span className="text-laranja">track</span>
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Capa do evento */}
        {event.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={event.imageUrl}
            alt={event.name}
            className="w-full aspect-[16/9] object-cover rounded-2xl mb-4 border border-gray-100"
          />
        )}

        {/* Hero do evento */}
        <div className="bg-grafite rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-laranja/10 blur-2xl" />
          <div className="relative">
            <span className="inline-block bg-laranja/15 border border-laranja/20 text-laranja text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
              Confirmação de presença
            </span>
            <h1 className="text-2xl font-bold leading-tight mb-3">{event.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-white/70 text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {event.dateLabel} · {event.time}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {event.local}
              </span>
            </div>
            {/* Vagas */}
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-laranja" />
              {remaining === null ? (
                <span className="text-white/60">Vagas ilimitadas</span>
              ) : isFull ? (
                <span className="text-laranja font-medium">Evento lotado — lista de espera disponível</span>
              ) : (
                <span className="text-white/80">
                  <span className="font-semibold text-white">{remaining}</span> de {capacity} vagas restantes
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Resultado OU estados de inscrição OU formulário */}
        {result ? (
          <InviteCard event={event} confirmation={result} />
        ) : regNotOpen ? (
          <RegistrationNotice
            icon={<CalendarClock className="w-6 h-6 text-laranja" />}
            title="As inscrições ainda não abriram"
            message={`A confirmação de presença estará disponível a partir de ${formatWindow(event.registrationOpensAt!)}.`}
          />
        ) : regClosed ? (
          <RegistrationNotice
            icon={<CalendarX className="w-6 h-6 text-gray-400" />}
            title="As inscrições foram encerradas"
            message={`O período de confirmação se encerrou em ${formatWindow(event.registrationClosesAt!)}.`}
          />
        ) : event.paid ? (
          <PaidPurchaseFlow event={event} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            {isFull && (
              <div className="flex items-start gap-2.5 bg-laranja/5 border border-laranja/15 rounded-xl p-3.5 mb-5">
                <AlertCircle className="w-4 h-4 text-laranja mt-0.5 flex-shrink-0" />
                <p className="text-grafite-muted text-sm">
                  As vagas se esgotaram. Você pode entrar na <span className="font-semibold text-grafite">lista de espera</span> — avisaremos por e-mail se uma vaga for liberada.
                </p>
              </div>
            )}

            <h2 className="text-grafite font-bold text-lg mb-1">
              {isFull ? "Entrar na lista de espera" : "Confirme sua presença"}
            </h2>
            <p className="text-grafite-muted text-sm mb-6">
              Preencha seus dados para {isFull ? "entrar na fila" : "receber seu convite com QR Code por e-mail"}.
            </p>

            {notice && (
              <div role="alert" className="mb-5 flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-xl">
                {notice}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-grafite mb-1.5">
                  Nome completo
                </label>
                <input
                  id="nome"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((er) => ({ ...er, name: undefined }));
                  }}
                  placeholder="Seu nome"
                  className={`w-full h-12 px-4 rounded-xl border text-sm text-grafite outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja ${errors.name ? "border-red-400" : "border-gray-200 hover:border-gray-300"}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-grafite mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                  }}
                  placeholder="seu@email.com"
                  className={`w-full h-12 px-4 rounded-xl border text-sm text-grafite outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja ${errors.email ? "border-red-400" : "border-gray-200 hover:border-gray-300"}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-laranja/25"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                ) : isFull ? (
                  <><Clock className="w-4 h-4" /> Entrar na lista de espera</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirmar presença</>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                Ao confirmar, você concorda com os termos do organizador.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Aviso de inscrições (não abertas / encerradas) ──── */
function RegistrationNotice({
  icon, title, message,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-fundo flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h2 className="text-grafite font-bold text-lg mb-2">{title}</h2>
      <p className="text-grafite-muted text-sm max-w-sm mx-auto leading-relaxed">{message}</p>
    </div>
  );
}

/* ── Card do convite com QR Code ─────────────────────── */
function InviteCard({
  event, confirmation,
}: {
  event: EventItem;
  confirmation: Confirmation;
}) {
  const isWaitlist = confirmation.status === "lista_espera";

  return (
    <div>
      {/* Mensagem de sucesso */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          {isWaitlist ? (
            <Clock className="w-5 h-5 text-green-600" />
          ) : (
            <PartyPopper className="w-5 h-5 text-green-600" />
          )}
        </div>
        <div>
          <p className="text-grafite font-semibold text-sm">
            {isWaitlist ? "Você está na lista de espera!" : "Presença confirmada!"}
          </p>
          <p className="text-grafite-muted text-sm mt-0.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Enviamos uma cópia para {confirmation.email}
          </p>
        </div>
      </div>

      {!isWaitlist && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Cabeçalho do convite */}
          <div className="bg-grafite p-6 text-center text-white relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-laranja" />
            <p className="text-laranja text-xs font-semibold uppercase tracking-widest mb-2">
              Seu convite
            </p>
            <h3 className="text-xl font-bold leading-tight">{event.name}</h3>
            <p className="text-white/60 text-sm mt-2">
              {event.dateLabel} · {event.time}
            </p>
            <p className="text-white/60 text-sm">{event.local}</p>
          </div>

          {/* QR Code */}
          <div className="p-6 flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100">
              <QRCodeSVG
                value={confirmation.id}
                size={180}
                level="M"
                fgColor="#1E2535"
                bgColor="#ffffff"
              />
            </div>
            <p className="text-grafite font-semibold mt-4">{confirmation.name}</p>
            <p className="text-grafite-muted text-sm">Apresente este QR Code na entrada</p>

            {/* Linha pontilhada decorativa */}
            <div className="w-full border-t border-dashed border-gray-200 my-5" />

            <p className="text-gray-400 text-xs text-center">
              Código do convite: <span className="font-mono">{confirmation.id.slice(0, 8)}</span>
            </p>

            <button
              onClick={() => window.print()}
              className="mt-4 flex items-center gap-2 border border-gray-200 hover:border-laranja hover:text-laranja text-grafite text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Salvar / imprimir convite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
