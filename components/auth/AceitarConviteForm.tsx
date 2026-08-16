"use client";

/**
 * Aceite do convite de equipe: a pessoa só escolhe nome e senha.
 * O e-mail, a organização e o papel vêm do token e NÃO são editáveis aqui, para
 * ninguém entrar numa organização diferente da que foi convidada.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { MIN_PASSWORD } from "@/lib/password";

export default function AceitarConviteForm({
  token, email, papel, organizacao,
}: {
  token: string;
  email: string;
  papel: "DONO" | "OPERADOR";
  organizacao: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const input =
    "w-full h-11 px-4 rounded-xl border border-border bg-card text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < MIN_PASSWORD) {
      setErro(`A senha deve ter ao menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não são iguais.");
      return;
    }

    setEnviando(true);
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, nome, senha }),
    });
    const dados = await res.json().catch(() => ({}));
    setEnviando(false);

    if (!res.ok) {
      setErro(dados?.error ?? "Não foi possível aceitar o convite.");
      return;
    }
    router.push("/login?convite=aceito");
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-8">
      <div className="w-12 h-12 rounded-2xl bg-laranja/10 flex items-center justify-center mb-4">
        <Users className="w-6 h-6 text-laranja" />
      </div>

      <h1 className="text-xl font-bold text-foreground">
        Você foi convidado para {organizacao}
      </h1>
      <p className="text-muted-foreground text-sm mt-1">
        Crie sua senha para entrar na equipe como{" "}
        <span className="font-semibold text-foreground">
          {papel === "DONO" ? "dono" : "operador"}
        </span>
        .
      </p>

      <form onSubmit={enviar} className="mt-6 space-y-4">
        {erro && (
          <div role="alert" className="bg-red-500/10 border border-red-500/25 text-red-600 text-sm px-4 py-3 rounded-xl">
            {erro}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
          {/* Vem do convite e não pode ser trocado: é o que amarra a pessoa certa. */}
          <input value={email} disabled className={`${input} opacity-60 cursor-not-allowed`} />
        </div>

        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-foreground mb-1.5">Seu nome</label>
          <input
            id="nome" value={nome} onChange={(e) => setNome(e.target.value)}
            required autoComplete="name" className={input}
          />
        </div>

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
          <input
            id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
            required autoComplete="new-password" className={input}
          />
          <p className="text-xs text-muted-foreground mt-1">Ao menos {MIN_PASSWORD} caracteres.</p>
        </div>

        <div>
          <label htmlFor="confirma" className="block text-sm font-medium text-foreground mb-1.5">Confirme a senha</label>
          <input
            id="confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)}
            required autoComplete="new-password" className={input}
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</> : "Aceitar convite"}
        </button>
      </form>
    </div>
  );
}
