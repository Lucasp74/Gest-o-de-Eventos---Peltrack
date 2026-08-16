"use client";

/**
 * Equipe da organização: membros, convites pendentes e o formulário de convite.
 * Vive em Configurações, que é página do dono. Toda ação daqui também é
 * conferida no servidor, então esconder botão nunca é a única trava.
 */
import { useCallback, useEffect, useState } from "react";
import { Users, Loader2, Trash2, Mail, Crown, ScanLine } from "lucide-react";

type Papel = "DONO" | "OPERADOR";

type Membro = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  tenantRole: Papel;
};

type Pendente = { email: string; papel: Papel; expira: string };

type Dados = { permitido: boolean; membros: Membro[]; pendentes: Pendente[] };

const PAPEL_LABEL: Record<Papel, string> = { DONO: "Dono", OPERADOR: "Operador" };

export default function TeamCard() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("OPERADOR");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Recarrega por VERSÃO em vez de chamar a busca dentro do efeito: assim nada
  // chama setState de forma síncrona no corpo do efeito.
  const [versao, setVersao] = useState(0);
  const carregar = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/team")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Dados | null) => { if (vivo) setDados(d); })
      .catch(() => { if (vivo) setDados(null); });
    return () => { vivo = false; };
  }, [versao]);

  async function convidar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, papel }),
    });
    const d = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) { setErro(d?.error ?? "Não foi possível enviar o convite."); return; }
    setEmail("");
    setAviso(`Convite enviado para ${email}.`);
    carregar();
  }

  async function trocarPapel(m: Membro, novo: Papel) {
    setErro(null);
    const res = await fetch(`/api/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ papel: novo }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d?.error ?? "Não foi possível trocar o papel.");
      return;
    }
    carregar();
  }

  async function remover(m: Membro) {
    if (!confirm(`Remover ${m.name ?? m.email} da equipe?`)) return;
    setErro(null);
    const res = await fetch(`/api/team/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d?.error ?? "Não foi possível remover.");
      return;
    }
    setAviso(`${m.name ?? m.email} saiu da equipe.`);
    carregar();
  }

  const input =
    "h-10 px-3 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja";

  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-laranja" />
        <h3 className="text-foreground font-semibold">Equipe</h3>
      </div>
      <p className="text-muted-foreground text-sm mb-5">
        Convide pessoas para operar seus eventos. O dono vê tudo; o operador usa o scanner e a
        lista de convidados, sem acesso a financeiro nem a estas configurações.
      </p>

      {erro && (
        <div role="alert" className="mb-4 bg-red-500/10 border border-red-500/25 text-red-600 text-sm px-4 py-3 rounded-xl">
          {erro}
        </div>
      )}
      {aviso && (
        <div className="mb-4 bg-green-500/10 border border-green-500/25 text-foreground text-sm px-4 py-3 rounded-xl">
          {aviso}
        </div>
      )}

      {dados === null ? (
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
      ) : (
        <>
          {/* Membros */}
          <div className="border border-border rounded-xl divide-y divide-border mb-4">
            {dados.membros.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-laranja/10 text-laranja flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                  {m.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (m.name ?? m.email).charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{m.name ?? "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  {m.tenantRole === "DONO" ? <Crown className="w-3.5 h-3.5" /> : <ScanLine className="w-3.5 h-3.5" />}
                  {PAPEL_LABEL[m.tenantRole]}
                </span>
                <select
                  value={m.tenantRole}
                  onChange={(e) => trocarPapel(m, e.target.value as Papel)}
                  aria-label={`Papel de ${m.email}`}
                  className={`${input} w-32 flex-shrink-0`}
                >
                  <option value="DONO">Dono</option>
                  <option value="OPERADOR">Operador</option>
                </select>
                <button
                  onClick={() => remover(m)}
                  aria-label={`Remover ${m.email}`}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Convites ainda não aceitos */}
          {dados.pendentes.length > 0 && (
            <div className="border border-dashed border-border rounded-xl divide-y divide-border mb-4">
              {dados.pendentes.map((p) => (
                <div key={p.email} className="flex items-center gap-3 px-4 py-2.5">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{p.email}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {PAPEL_LABEL[p.papel]} · aguardando aceite
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Convidar */}
          {dados.permitido ? (
            <form onSubmit={convidar} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e-mail de quem vai entrar"
                className={`${input} flex-1`}
              />
              <select
                value={papel}
                onChange={(e) => setPapel(e.target.value as Papel)}
                aria-label="Papel do convidado"
                className={`${input} sm:w-36`}
              >
                <option value="OPERADOR">Operador</option>
                <option value="DONO">Dono</option>
              </select>
              <button
                type="submit"
                disabled={enviando}
                className="flex items-center justify-center gap-2 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white text-sm font-semibold px-5 h-10 rounded-xl transition-colors"
              >
                {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : "Convidar"}
              </button>
            </form>
          ) : (
            /* Quem caiu para Starter mantém a equipe atual e só não convida mais. */
            <div className="bg-fundo/50 border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
              Convidar pessoas para a equipe está disponível nos planos Pro e Enterprise.
            </div>
          )}
        </>
      )}
    </div>
  );
}
