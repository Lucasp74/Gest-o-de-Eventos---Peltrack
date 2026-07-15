"use client";

import { useState } from "react";
import { Loader2, Check, KeyRound } from "lucide-react";

export default function AccountPasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 6) {
      setError("A nova senha deve ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setCurrent("");
      setNext("");
      setTimeout(() => setDone(false), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar a senha.");
    }
  }

  const input =
    "w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-grafite outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition-all";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center">
          <KeyRound className="w-[18px] h-[18px] text-laranja" />
        </div>
        <h2 className="text-grafite font-semibold">
          {hasPassword ? "Alterar senha" : "Criar uma senha"}
        </h2>
      </div>
      <p className="text-grafite-muted text-sm mb-5">
        {hasPassword
          ? "Atualize a senha usada no login por e-mail."
          : "Você entrou com o Google. Crie uma senha para também poder entrar com e-mail e senha."}
      </p>

      {error && (
        <div role="alert" className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 max-w-sm">
        {hasPassword && (
          <div>
            <label className="block text-sm font-medium text-grafite mb-1.5">Senha atual</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} autoComplete="current-password" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-grafite mb-1.5">Nova senha</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Mínimo de 6 caracteres" className={input} autoComplete="new-password" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading} className="flex items-center gap-2 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (hasPassword ? "Alterar senha" : "Criar senha")}
          </button>
          {done && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
              <Check className="w-4 h-4" /> Senha salva
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
