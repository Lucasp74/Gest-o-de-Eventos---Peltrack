"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Loader2, Check, Trash2, AlertTriangle, X, CalendarClock, Globe, Lock, ImagePlus,
} from "lucide-react";
import { type EventItem, type EventStatus, STATUS_META } from "@/lib/mockEvents";

const STATUS_OPTIONS: EventStatus[] = [
  "rascunho", "inscricoes", "ativo", "lotado", "encerrado",
];

export default function SettingsView({
  event, onUpdated,
}: {
  event: EventItem;
  onUpdated: () => void;
}) {
  const router = useRouter();

  const [name, setName] = useState(event.name);
  const [startAt, setStartAt] = useState(`${event.date}T${event.time}`);
  const [local, setLocal] = useState(event.local);
  const [capacity, setCapacity] = useState(String(event.capacity || ""));
  const [status, setStatus] = useState<EventStatus>(event.status);
  const [visibility, setVisibility] = useState<"publico" | "restrito">(event.visibility ?? "restrito");

  // Imagem: image = preview atual (url salva ou data-url nova); imageFile = novo arquivo a subir
  const [image, setImage] = useState<string | null>(event.imageUrl ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [regEnabled, setRegEnabled] = useState(!!event.registrationOpensAt);
  const [regOpensAt, setRegOpensAt] = useState(event.registrationOpensAt ?? "");
  const [regClosesAt, setRegClosesAt] = useState(event.registrationClosesAt ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const input =
    "w-full h-11 px-4 rounded-xl border bg-white text-sm text-grafite outline-none transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja";

  function cls(err?: string) {
    return `${input} ${err ? "border-red-400" : "border-gray-200 hover:border-gray-300"}`;
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Informe o nome do evento";
    if (!startAt) e.startAt = "Defina a data e hora";
    if (regEnabled) {
      if (!regOpensAt) e.regOpensAt = "Defina a abertura";
      if (!regClosesAt) e.regClosesAt = "Defina o fechamento";
      if (regOpensAt && regClosesAt && regClosesAt <= regOpensAt)
        e.regClosesAt = "O fechamento deve ser depois da abertura";
    }
    return e;
  }

  function handleImage(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }
  function removeImage() {
    setImage(null);
    setImageFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    setSaveError(null);

    // Sobe a nova imagem (se trocada); senão mantém a atual (ou null se removida)
    let imageUrl: string | null = image;
    if (imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) {
        setSaving(false);
        setSaveError("Não foi possível enviar a imagem.");
        return;
      }
      imageUrl = (await up.json()).url;
    }

    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        imageUrl,
        startAt,
        local: local.trim(),
        capacity: parseInt(capacity) || 0,
        status,
        visibility,
        registrationOpensAt: regEnabled ? regOpensAt : null,
        registrationClosesAt: regEnabled ? regClosesAt : null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onUpdated();
    } else {
      const data = await res.json().catch(() => ({}));
      setSaveError(data.error ?? "Não foi possível salvar as alterações.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard/eventos");
      router.refresh();
    } else {
      setDeleting(false);
      setConfirmDelete(false);
      setSaveError("Não foi possível excluir o evento.");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleSave} className="space-y-6">
        {/* Imagem de divulgação */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center">
              <ImagePlus className="w-[18px] h-[18px] text-laranja" />
            </div>
            <h3 className="text-grafite font-semibold">Imagem de divulgação</h3>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
          {image ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Prévia" className="w-full aspect-[16/9] object-cover" />
              <button type="button" onClick={removeImage} className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-grafite/80 text-white flex items-center justify-center hover:bg-grafite transition-colors" aria-label="Remover imagem">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-gray-200 hover:border-laranja/40 hover:bg-fundo/50 transition-colors flex flex-col items-center justify-center gap-2 text-grafite-muted">
              <ImagePlus className="w-6 h-6 text-laranja" />
              <p className="text-sm font-medium text-grafite">Adicionar imagem</p>
              <p className="text-xs">Recomendado 1600 × 900 px · JPG ou PNG</p>
            </button>
          )}
        </div>

        {/* Dados do evento */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <h3 className="text-grafite font-semibold">Dados do evento</h3>

          <div>
            <label className="block text-sm font-medium text-grafite mb-1.5">Nome do evento</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={cls(errors.name)} />
            {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-grafite mb-1.5">Data e hora</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={cls(errors.startAt)} />
              {errors.startAt && <p className="text-xs text-red-500 mt-1.5">{errors.startAt}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-grafite mb-1.5">Local</label>
              <input value={local} onChange={(e) => setLocal(e.target.value)} className={cls()} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-grafite mb-1.5">
                Capacidade <span className="text-grafite-muted font-normal">(0 = ilimitada)</span>
              </label>
              <input
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="0"
                className={cls()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-grafite mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                className={cls()}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Visibilidade */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center">
              <Globe className="w-[18px] h-[18px] text-laranja" />
            </div>
            <h3 className="text-grafite font-semibold">Visibilidade</h3>
          </div>
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
                <span className="block text-grafite-muted text-xs mt-0.5">Só com link/convite. Fora da vitrine.</span>
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
                <span className="block text-grafite-muted text-xs mt-0.5">Aparece na vitrine. Qualquer um se inscreve.</span>
              </span>
            </button>
          </div>
        </div>

        {/* Período de inscrições */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center">
              <CalendarClock className="w-[18px] h-[18px] text-laranja" />
            </div>
            <h3 className="text-grafite font-semibold">Período de inscrições</h3>
          </div>

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
              Se ativado, os convidados só confirmam presença dentro da janela. Se desativado, fica aberto até lotar.
            </span>
          </label>

          {regEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-grafite mb-1.5">Abertura</label>
                <input type="datetime-local" value={regOpensAt} onChange={(e) => setRegOpensAt(e.target.value)} className={cls(errors.regOpensAt)} />
                {errors.regOpensAt && <p className="text-xs text-red-500 mt-1.5">{errors.regOpensAt}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-grafite mb-1.5">Fechamento</label>
                <input type="datetime-local" value={regClosesAt} onChange={(e) => setRegClosesAt(e.target.value)} className={cls(errors.regClosesAt)} />
                {errors.regClosesAt && <p className="text-xs text-red-500 mt-1.5">{errors.regClosesAt}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Salvar */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm shadow-lg shadow-laranja/25"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar alterações</>}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
              <Check className="w-4 h-4" /> Alterações salvas
            </span>
          )}
          {saveError && (
            <span className="text-red-500 text-sm font-medium">{saveError}</span>
          )}
        </div>
      </form>

      {/* Zona de perigo */}
      <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="text-red-600 font-semibold">Zona de perigo</h3>
        </div>
        <p className="text-grafite-muted text-sm mb-4">
          Excluir o evento remove permanentemente os dados, confirmações e registros de presença. Esta ação não pode ser desfeita.
        </p>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Excluir evento
        </button>
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-grafite font-bold">Excluir evento</h3>
              <button onClick={() => setConfirmDelete(false)} aria-label="Fechar" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-grafite hover:bg-gray-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-grafite text-sm leading-relaxed">
                Tem certeza que deseja excluir <span className="font-semibold">&ldquo;{event.name}&rdquo;</span>?
                Todos os dados serão removidos permanentemente.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-fundo/30">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-grafite text-sm font-medium hover:border-gray-300 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold transition-colors">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : <><Trash2 className="w-4 h-4" /> Excluir definitivamente</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
