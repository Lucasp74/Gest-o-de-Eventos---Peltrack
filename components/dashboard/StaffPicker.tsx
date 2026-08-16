"use client";

/**
 * Quem da equipe trabalha neste evento.
 *
 * Dois modos, mesma lista:
 *  · sem eventId  → criação, controlado pelo formulário (value/onChange)
 *  · com eventId  → edição, salva sozinho no botão
 *
 * Só aparecem OPERADORES: escalar um dono não mudaria nada, ele já enxerga
 * todos os eventos da organização.
 */
import { useEffect, useState } from "react";
import { Users, Loader2, Check } from "lucide-react";

type Operador = { id: string; name: string | null; email: string; image: string | null };

export default function StaffPicker({
  eventId, value, onChange,
}: {
  eventId?: string;
  value?: string[];
  onChange?: (ids: string[]) => void;
}) {
  const [operadores, setOperadores] = useState<Operador[] | null>(null);
  const [interno, setInterno] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const selecionados = value ?? interno;

  useEffect(() => {
    let vivo = true;
    const url = eventId ? `/api/events/${eventId}/staff` : "/api/team";

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d) { if (vivo) setOperadores([]); return; }
        if (eventId) {
          setOperadores(d.operadores ?? []);
          setInterno(d.escalados ?? []);
        } else {
          // Na criação a lista vem da equipe, filtrando só os operadores.
          setOperadores((d.membros ?? []).filter((m: { tenantRole: string }) => m.tenantRole === "OPERADOR"));
        }
      })
      .catch(() => { if (vivo) setOperadores([]); });

    return () => { vivo = false; };
  }, [eventId]);

  function alternar(id: string) {
    const novo = selecionados.includes(id)
      ? selecionados.filter((x) => x !== id)
      : [...selecionados, id];
    setSalvo(false);
    if (onChange) onChange(novo);
    else setInterno(novo);
  }

  async function salvar() {
    if (!eventId) return;
    setSalvando(true);
    setErro(null);
    const res = await fetch(`/api/events/${eventId}/staff`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: selecionados }),
    });
    setSalvando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d?.error ?? "Não foi possível salvar a escala.");
      return;
    }
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-laranja" />
        <h3 className="text-foreground font-semibold text-sm">Quem trabalha neste evento</h3>
      </div>
      <p className="text-muted-foreground text-xs mb-4">
        O operador só enxerga os eventos em que está escalado, com a lista de convidados e o
        scanner. Você, como dono, vê todos.
      </p>

      {erro && (
        <div role="alert" className="mb-3 bg-red-500/10 border border-red-500/25 text-red-600 text-sm px-3 py-2 rounded-xl">
          {erro}
        </div>
      )}

      {operadores === null ? (
        <div className="h-16 rounded-xl bg-muted animate-pulse" />
      ) : operadores.length === 0 ? (
        <div className="bg-fundo/50 border border-dashed border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
          Você ainda não tem operadores na equipe. Convide em Configurações, seção Equipe.
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl divide-y divide-border">
            {operadores.map((o) => {
              const marcado = selecionados.includes(o.id);
              return (
                <label
                  key={o.id}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-fundo/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(o.id)}
                    className="w-4 h-4 accent-laranja flex-shrink-0"
                  />
                  <div className="w-8 h-8 rounded-full bg-laranja/10 text-laranja flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden">
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (o.name ?? o.email).charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{o.name ?? "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.email}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Escala vazia é silenciosa: o operador simplesmente não vê o evento
              e o sintoma chega como "não aparece nada pra mim". */}
          {selecionados.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              Ninguém escalado. Nenhum operador vai enxergar este evento.
            </p>
          )}

          {eventId && (
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="mt-3 flex items-center gap-2 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                : salvo ? <><Check className="w-4 h-4" /> Escala salva</>
                : "Salvar escala"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
