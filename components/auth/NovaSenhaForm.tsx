"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { MIN_PASSWORD } from "@/lib/password";

export default function NovaSenhaForm({ token }: { token: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < MIN_PASSWORD) {
      setErro(`A senha deve ter ao menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (senha !== repetir) {
      setErro("As senhas não são iguais.");
      return;
    }
    setErro(null);
    setSalvando(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: senha }),
    });
    setSalvando(false);

    if (res.ok) {
      setPronto(true);
      return;
    }
    const d = await res.json().catch(() => ({}));
    setErro(d.error ?? "Não foi possível redefinir a senha.");
  }

  if (pronto) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-foreground font-bold text-xl mb-2">Senha alterada!</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Já pode entrar na sua conta com a senha nova.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full h-12 bg-laranja hover:bg-laranja-dark text-white font-semibold text-sm rounded-xl transition-colors"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  const campo =
    "w-full h-12 pl-4 pr-11 rounded-xl border border-border bg-fundo text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition";

  return (
    <form onSubmit={salvar}>
      <h1 className="text-foreground font-bold text-xl mb-1">Criar nova senha</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Escolha uma senha de no mínimo {MIN_PASSWORD} caracteres.
      </p>

      {erro && (
        <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {erro}
        </div>
      )}

      <label htmlFor="senha" className="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
      <div className="relative">
        <input
          id="senha"
          type={mostrar ? "text" : "password"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          className={campo}
        />
        <button
          type="button"
          onClick={() => setMostrar((v) => !v)}
          aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition p-1"
        >
          {mostrar ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
        </button>
      </div>

      <label htmlFor="repetir" className="block text-sm font-medium text-foreground mb-1.5 mt-4">
        Repita a nova senha
      </label>
      <input
        id="repetir"
        type={mostrar ? "text" : "password"}
        value={repetir}
        onChange={(e) => setRepetir(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        className={campo}
      />

      <button
        type="submit"
        disabled={salvando}
        className="w-full h-12 mt-5 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
        {salvando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
