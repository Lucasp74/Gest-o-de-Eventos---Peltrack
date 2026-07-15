"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus, X, Calendar, MapPin, Ticket, Plus, Trash2,
  Loader2, Check, QrCode, Tag, Type, ArrowLeft, CalendarClock,
  Globe, Lock,
} from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { formatBRL } from "@/lib/planPricing";

/* ── Listas de assunto e categoria ───────────────────── */
const SUBJECT_LIST = [
  "Acadêmico e científico", "Agro", "Artesanato", "Casa e estilo de vida",
  "Cinema e fotografia", "Corporativo e negócios", "Cultural e artes",
  "Design e produtos digitais", "Desenvolvimento pessoal", "Educação",
  "Empreendedorismo", "Esportes", "Gastronomia", "Games e geek",
  "Moda e beleza", "Música", "Religião e espiritualidade",
  "Saúde e bem-estar", "Tecnologia", "Turismo e viagem",
];

const CATEGORY_LIST = [
  "Show", "Festival", "Festa", "Esportivo", "Teatro", "Stand-up",
  "Corporativo", "Formatura", "Congresso", "Palestra", "Workshop",
  "Feira", "Treinamento", "Networking", "Seminário", "Curso",
  "Webinar", "Encontro", "Cerimônia",
];

interface TicketType {
  id: string;
  name: string;
  price: string;
  quantity: string;
  passFeeToBuyer: boolean;
}

/** "10,00" / "1.500,00" → 10 / 1500 */
function parsePrice(s: string): number {
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

export default function CreateEventForm({ feePct = 0.08 }: { feePct?: number }) {
  const router = useRouter();

  // Campos principais
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [subjectOptions, setSubjectOptions] = useState<string[]>(SUBJECT_LIST);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(CATEGORY_LIST);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");

  // Período de inscrições (opcional)
  const [regEnabled, setRegEnabled] = useState(false);
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");

  // Imagem
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Localização
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [address, setAddress] = useState({
    venue: "", street: "", number: "", complement: "",
    district: "", city: "", uf: "",
  });

  // Visibilidade (público na vitrine × restrito)
  const [visibility, setVisibility] = useState<"publico" | "restrito">("restrito");

  // Ingressos
  const [paid, setPaid] = useState(false);
  const [tickets, setTickets] = useState<TicketType[]>([
    { id: "t1", name: "Inteira", price: "", quantity: "", passFeeToBuyer: true },
  ]);

  // Aceite e submit
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ── Mapa embutido (sem chave) ───────────────────── */
  const mapQuery = useMemo(() => {
    const parts = [
      address.street, address.number, address.district,
      address.city, address.uf,
    ].filter(Boolean);
    return parts.length >= 2 ? parts.join(", ") : null;
  }, [address]);

  /* ── ViaCEP ──────────────────────────────────────── */
  async function lookupCep(value: string) {
    const clean = value.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress((a) => ({
          ...a,
          street: data.logradouro || "",
          district: data.bairro || "",
          city: data.localidade || "",
          uf: data.uf || "",
        }));
      }
    } catch {
      /* silencioso — usuário pode preencher manualmente */
    } finally {
      setCepLoading(false);
    }
  }

  /* ── Imagem ──────────────────────────────────────── */
  function handleImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* ── Ingressos ───────────────────────────────────── */
  function addTicket() {
    setTickets((t) => [
      ...t,
      { id: `t${Date.now()}`, name: "", price: "", quantity: "", passFeeToBuyer: true },
    ]);
  }
  function removeTicket(id: string) {
    setTickets((t) => (t.length > 1 ? t.filter((x) => x.id !== id) : t));
  }
  function toggleTicketFee(id: string) {
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, passFeeToBuyer: !x.passFeeToBuyer } : x)));
  }
  function updateTicket(id: string, field: "name" | "price" | "quantity", value: string) {
    setTickets((t) =>
      t.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  }

  /* ── Validação + submit ──────────────────────────── */
  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Informe o nome do evento";
    if (!subject) e.subject = "Selecione o assunto";
    if (!startAt) e.startAt = "Defina a data e hora de início";
    if (!endAt) e.endAt = "Defina a data e hora de término";
    if (startAt && endAt && endAt <= startAt)
      e.endAt = "O término deve ser depois do início";
    if (regEnabled) {
      if (!regOpensAt) e.regOpensAt = "Defina a abertura das inscrições";
      if (!regClosesAt) e.regClosesAt = "Defina o fechamento das inscrições";
      if (regOpensAt && regClosesAt && regClosesAt <= regOpensAt)
        e.regClosesAt = "O fechamento deve ser depois da abertura";
    }
    if (!description.trim()) e.description = "Adicione uma descrição";
    if (!accepted) e.accepted = "É necessário aceitar os termos";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = document.querySelector(`[data-error="true"]`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const ticketTypes = paid
      ? tickets.map((t) => ({
          name: t.name.trim() || "Ingresso",
          price: parsePrice(t.price),
          quantity: parseInt(t.quantity) || 0,
          passFeeToBuyer: t.passFeeToBuyer,
        }))
      : [];

    // Faz o upload da imagem (se houver) antes de criar o evento
    let imageUrl: string | null = null;
    const file = fileRef.current?.files?.[0];
    if (image && file) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (up.ok) {
        imageUrl = (await up.json()).url;
      } else {
        setSubmitting(false);
        setSubmitError("Não foi possível enviar a imagem. Tente outra ou remova-a.");
        return;
      }
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description,
        imageUrl,
        subject,
        category,
        startAt,
        endAt,
        venue: address.venue,
        street: address.street,
        number: address.number,
        complement: address.complement,
        district: address.district,
        city: address.city,
        uf: address.uf,
        cep,
        paid,
        visibility,
        tickets: ticketTypes,
        ...(regEnabled
          ? { registrationOpensAt: regOpensAt, registrationClosesAt: regClosesAt }
          : {}),
      }),
    });

    if (res.ok) {
      router.push("/dashboard/eventos");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error ?? "Não foi possível criar o evento. Tente novamente.");
      setSubmitting(false);
    }
  }

  const inputBase =
    "w-full h-11 px-4 rounded-xl border bg-white text-sm text-grafite outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">

      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push("/dashboard/eventos")}
          className="flex items-center gap-1.5 text-grafite-muted hover:text-grafite text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Meus eventos
        </button>
        <h1 className="text-2xl font-bold text-grafite">Criar evento</h1>
        <p className="text-grafite-muted text-sm mt-1">
          Preencha as informações abaixo para publicar seu evento.
        </p>
      </div>

      <div className="space-y-6">

        {/* 1 + 5 — Informações básicas */}
        <Section icon={Type} title="Informações do evento">
          <Field label="Nome do evento" required error={errors.name}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Formatura Engenharia — Turma 2024"
              className={fieldCls(inputBase, errors.name)}
            />
          </Field>

          <Field label="Descrição" required error={errors.description}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Conte os detalhes do seu evento: programação, o que esperar, informações importantes..."
              className={fieldCls(
                "w-full px-4 py-3 rounded-xl border bg-white text-sm text-grafite outline-none transition-all resize-y placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja",
                errors.description,
              )}
            />
          </Field>
        </Section>

        {/* 2 — Imagem */}
        <Section icon={ImagePlus} title="Imagem de divulgação" optional>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImage(e.target.files?.[0])}
          />
          {image ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Prévia da divulgação" className="w-full aspect-[1600/838] object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-grafite/80 text-white flex items-center justify-center hover:bg-grafite transition-colors"
                aria-label="Remover imagem"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[1600/838] rounded-xl border-2 border-dashed border-gray-200 hover:border-laranja/40 hover:bg-fundo/50 transition-colors flex flex-col items-center justify-center gap-2 text-grafite-muted"
            >
              <div className="w-12 h-12 rounded-xl bg-fundo flex items-center justify-center">
                <ImagePlus className="w-6 h-6 text-laranja" />
              </div>
              <p className="text-sm font-medium text-grafite">Clique para enviar uma imagem</p>
              <p className="text-xs">Recomendado 1600 × 838 px · JPG ou PNG</p>
            </button>
          )}
        </Section>

        {/* 3 — Assunto e categoria */}
        <Section icon={Tag} title="Classifique seu evento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Assunto" required error={errors.subject}>
              <Combobox
                value={subject}
                onChange={setSubject}
                options={subjectOptions}
                onCreate={(v) => setSubjectOptions((o) => [...o, v])}
                placeholder="Selecione um assunto"
                error={!!errors.subject}
              />
            </Field>

            <Field label="Categoria (opcional)">
              <Combobox
                value={category}
                onChange={setCategory}
                options={categoryOptions}
                onCreate={(v) => setCategoryOptions((o) => [...o, v])}
                placeholder="Selecione uma categoria"
              />
            </Field>
          </div>
        </Section>

        {/* 4 — Data e hora */}
        <Section icon={Calendar} title="Data e horário">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Início" required error={errors.startAt}>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className={fieldCls(inputBase, errors.startAt)}
              />
            </Field>
            <Field label="Término" required error={errors.endAt}>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className={fieldCls(inputBase, errors.endAt)}
              />
            </Field>
          </div>
        </Section>

        {/* 4b — Período de inscrições (opcional) */}
        <Section icon={CalendarClock} title="Período de inscrições" optional>
          {/* Toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={regEnabled}
              onChange={(e) => setRegEnabled(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-laranja cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-grafite-muted leading-relaxed">
              <span className="font-medium text-grafite">Definir período de inscrições</span>
              <br />
              Se ativado, os convidados só conseguem confirmar presença dentro da janela definida.
              Se desativado, as inscrições ficam abertas até o evento lotar.
            </span>
          </label>

          {regEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <Field label="Abertura das inscrições" required error={errors.regOpensAt}>
                <input
                  type="datetime-local"
                  value={regOpensAt}
                  onChange={(e) => setRegOpensAt(e.target.value)}
                  className={fieldCls(inputBase, errors.regOpensAt)}
                />
              </Field>
              <Field label="Fechamento das inscrições" required error={errors.regClosesAt}>
                <input
                  type="datetime-local"
                  value={regClosesAt}
                  onChange={(e) => setRegClosesAt(e.target.value)}
                  className={fieldCls(inputBase, errors.regClosesAt)}
                />
              </Field>
            </div>
          )}
        </Section>

        {/* 6 — Localização */}
        <Section icon={MapPin} title="Localização">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="CEP">
              <div className="relative">
                <input
                  value={cep}
                  onChange={(e) => {
                    setCep(e.target.value);
                    lookupCep(e.target.value);
                  }}
                  placeholder="00000-000"
                  inputMode="numeric"
                  className={inputBase}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-laranja animate-spin" />
                )}
              </div>
            </Field>
            <Field label="Nome do local" className="sm:col-span-2">
              <input
                value={address.venue}
                onChange={(e) => setAddress((a) => ({ ...a, venue: e.target.value }))}
                placeholder="Ex: Teatro Municipal"
                className={inputBase}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Rua" className="sm:col-span-3">
              <input
                value={address.street}
                onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                placeholder="Logradouro"
                className={inputBase}
              />
            </Field>
            <Field label="Número">
              <input
                value={address.number}
                onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                placeholder="Nº"
                className={inputBase}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Field label="Complemento">
              <input
                value={address.complement}
                onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value }))}
                placeholder="Sala, bloco..."
                className={inputBase}
              />
            </Field>
            <Field label="Bairro">
              <input
                value={address.district}
                onChange={(e) => setAddress((a) => ({ ...a, district: e.target.value }))}
                className={inputBase}
              />
            </Field>
            <Field label="Cidade">
              <input
                value={address.city}
                onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                className={inputBase}
              />
            </Field>
            <Field label="UF">
              <input
                value={address.uf}
                onChange={(e) => setAddress((a) => ({ ...a, uf: e.target.value.toUpperCase().slice(0, 2) }))}
                maxLength={2}
                className={inputBase}
              />
            </Field>
          </div>

          {/* Mapa embutido */}
          {mapQuery && (
            <div className="rounded-xl overflow-hidden border border-gray-200 mt-1">
              <iframe
                title="Mapa do evento"
                width="100%"
                height="240"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
              />
            </div>
          )}
        </Section>

        {/* 6b — Visibilidade */}
        <Section icon={Globe} title="Visibilidade">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setVisibility("restrito")}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                visibility === "restrito" ? "border-laranja bg-laranja/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Lock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${visibility === "restrito" ? "text-laranja" : "text-grafite-muted"}`} />
              <span>
                <span className={`block font-semibold text-sm ${visibility === "restrito" ? "text-laranja" : "text-grafite"}`}>Restrito</span>
                <span className="block text-grafite-muted text-xs mt-0.5">Só quem tem o link ou convite. Não aparece na vitrine pública.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility("publico")}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                visibility === "publico" ? "border-laranja bg-laranja/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Globe className={`w-5 h-5 mt-0.5 flex-shrink-0 ${visibility === "publico" ? "text-laranja" : "text-grafite-muted"}`} />
              <span>
                <span className={`block font-semibold text-sm ${visibility === "publico" ? "text-laranja" : "text-grafite"}`}>Público</span>
                <span className="block text-grafite-muted text-xs mt-0.5">Aparece na vitrine de eventos da plataforma. Qualquer pessoa pode se inscrever.</span>
              </span>
            </button>
          </div>
        </Section>

        {/* 7 — Ingressos */}
        <Section icon={Ticket} title="Ingressos">
          {/* Toggle grátis / pago */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaid(false)}
              className={`p-4 rounded-xl border text-left transition-all ${
                !paid ? "border-laranja bg-laranja/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className={`font-semibold text-sm ${!paid ? "text-laranja" : "text-grafite"}`}>Gratuito</p>
              <p className="text-grafite-muted text-xs mt-0.5">Confirmação sem cobrança</p>
            </button>
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={`p-4 rounded-xl border text-left transition-all ${
                paid ? "border-laranja bg-laranja/5" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className={`font-semibold text-sm ${paid ? "text-laranja" : "text-grafite"}`}>Pago</p>
              <p className="text-grafite-muted text-xs mt-0.5">Cobrança via Pix (Mercado Pago)</p>
            </button>
          </div>

          {paid && (
            <div className="space-y-3 mt-2">
              {tickets.map((t, i) => {
                const priceNum = parsePrice(t.price);
                const feeVal = Math.round(priceNum * feePct * 100) / 100;
                const buyerPays = t.passFeeToBuyer
                  ? Math.round((priceNum + feeVal) * 100) / 100
                  : priceNum;
                const youGet = Math.round((buyerPays - feeVal) * 100) / 100;
                return (
                  <div key={t.id} className="bg-fundo/50 rounded-xl p-3 border border-gray-100 space-y-2.5">
                    <div className="flex gap-3 items-end">
                      <Field label={i === 0 ? "Tipo de ingresso" : ""} className="flex-1">
                        <input
                          value={t.name}
                          onChange={(e) => updateTicket(t.id, "name", e.target.value)}
                          placeholder="Ex: Inteira, Meia, VIP"
                          className={inputBase}
                        />
                      </Field>
                      <Field label={i === 0 ? "Preço (R$)" : ""} className="w-28">
                        <input
                          value={t.price}
                          onChange={(e) => updateTicket(t.id, "price", e.target.value)}
                          placeholder="0,00"
                          inputMode="decimal"
                          className={inputBase}
                        />
                      </Field>
                      <Field label={i === 0 ? "Qtd." : ""} className="w-24">
                        <input
                          value={t.quantity}
                          onChange={(e) => updateTicket(t.id, "quantity", e.target.value)}
                          placeholder="50"
                          inputMode="numeric"
                          className={inputBase}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeTicket(t.id)}
                        disabled={tickets.length === 1}
                        className="h-11 w-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Remover ingresso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Taxa: repassar ao comprador ou absorver */}
                    <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1.5 pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-grafite select-none">
                        <input
                          type="checkbox"
                          checked={t.passFeeToBuyer}
                          onChange={() => toggleTicketFee(t.id)}
                          className="w-4 h-4 rounded border-gray-300 accent-laranja cursor-pointer"
                        />
                        Repassar taxa ao cliente
                        <span
                          title={`Taxa de conveniência de ${(feePct * 100).toFixed(0).replace(".", ",")}%. Marcado: o comprador paga a taxa. Desmarcado: você absorve (recebe o preço menos a taxa).`}
                          className="w-4 h-4 rounded-full bg-grafite/10 text-grafite-muted text-[10px] font-bold flex items-center justify-center cursor-help"
                        >
                          ?
                        </span>
                      </label>
                      {priceNum > 0 && (
                        <p className="text-xs text-grafite-muted">
                          Preço do ingresso: <span className="font-semibold text-grafite">{formatBRL(buyerPays)}</span>
                          <span className="mx-1.5 text-gray-300">·</span>
                          Você recebe: <span className="font-semibold text-grafite">{formatBRL(youGet)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addTicket}
                className="flex items-center gap-1.5 text-laranja hover:text-laranja-dark text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar tipo de ingresso
              </button>

              {/* Aviso Mercado Pago */}
              <div className="flex items-start gap-2.5 bg-grafite/5 rounded-xl p-3.5 mt-2">
                <QrCode className="w-4 h-4 text-grafite mt-0.5 flex-shrink-0" />
                <p className="text-grafite-muted text-xs leading-relaxed">
                  Os pagamentos serão processados via <span className="font-semibold text-grafite">Mercado Pago</span> (Pix).
                  A integração com a conta de recebimento é configurada em <span className="font-medium">Configurações → Pagamentos</span>.
                </p>
              </div>
            </div>
          )}
        </Section>

        {/* 8 — Termos */}
        <div
          data-error={errors.accepted ? "true" : undefined}
          className={`rounded-2xl border p-5 ${errors.accepted ? "border-red-300 bg-red-50/50" : "border-gray-100 bg-white"}`}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 accent-laranja cursor-pointer flex-shrink-0"
            />
            <span className="text-sm text-grafite-muted leading-relaxed">
              Declaro que li e concordo com os{" "}
              <a href="/termos" className="text-laranja hover:underline font-medium">Termos de Uso</a>{" "}
              e a{" "}
              <a href="/privacidade" className="text-laranja hover:underline font-medium">Política de Privacidade</a>{" "}
              da plataforma, e que sou responsável pelas informações deste evento.
            </span>
          </label>
          {errors.accepted && (
            <p className="text-xs text-red-500 mt-2 ml-7">{errors.accepted}</p>
          )}
        </div>
      </div>

      {/* Barra de submit fixa */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-100 px-4 sm:px-6 lg:px-8 py-3.5 z-30">
        {submitError && (
          <div className="max-w-3xl mx-auto mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
            <span>{submitError}</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/eventos")}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-grafite text-sm font-medium hover:border-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm shadow-lg shadow-laranja/25"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Criando evento...</>
            ) : (
              <><Check className="w-4 h-4" /> Criar evento</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── Subcomponentes ──────────────────────────────────── */
function Section({
  icon: Icon, title, optional, children,
}: {
  icon: React.ElementType;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-laranja" />
        </div>
        <h2 className="text-grafite font-semibold text-base">{title}</h2>
        {optional && (
          <span className="text-xs text-grafite-muted bg-fundo px-2 py-0.5 rounded-full border border-gray-100">
            Opcional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label, required, error, className, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} data-error={error ? "true" : undefined}>
      {label && (
        <label className="block text-sm font-medium text-grafite mb-1.5">
          {label}
          {required && <span className="text-laranja ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

function fieldCls(base: string, error?: string) {
  return `${base} ${error ? "border-red-400 focus:border-red-400 focus:ring-red-100" : "border-gray-200 hover:border-gray-300"}`;
}
