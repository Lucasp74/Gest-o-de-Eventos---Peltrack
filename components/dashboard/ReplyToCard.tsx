"use client";

/**
 * Configura para onde vão as RESPOSTAS dos convidados.
 * O remetente continua sendo o nosso domínio (verificado) — o que muda é o
 * Reply-To, então "Responder" no e-mail do convidado cai direto no organizador.
 */
import { useState } from "react";
import { Mail, Loader2, Check } from "lucide-react";

export default function ReplyToCard({
  initialEmail, ownerEmail,
}: {
  initialEmail: string | null;
  ownerEmail: string | null;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);
    setSalvando(true);
    const res = await fetch("/api/account/reply-to", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyToEmail: email.trim() }),
    });
    setSalvando(false);
    if (res.ok) {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } else {
      const d = await res.json().catch(() => ({}));
      setErro(d.error ?? "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={salvar} className="bg-card rounded-2xl border border-border p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-5 h-5 text-laranja" />
        <h2 className="text-foreground font-bold">Respostas dos convidados</h2>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        Quando um convidado responder o convite, a mensagem vai para este endereço.
        Os convites saem no nome da sua organização.
      </p>

      {erro && (
        <div role="alert" className="mb-3 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl">
          {erro}
        </div>
      )}

      <label htmlFor="replyTo" className="block text-sm font-medium text-foreground mb-1.5">
        E-mail para respostas
      </label>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          id="replyTo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={ownerEmail ?? "eventos@suaempresa.com.br"}
          className="flex-1 h-11 px-4 rounded-xl border border-border bg-fundo text-sm text-foreground outline-none focus:ring-2 focus:ring-laranja/20 focus:border-laranja transition"
        />
        <button
          type="submit"
          disabled={salvando}
          className="h-11 px-5 bg-laranja hover:bg-laranja-dark disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 flex-shrink-0"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : salvo ? <Check className="w-4 h-4" /> : null}
          {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-2.5">
        {ownerEmail
          ? <>Deixe em branco para usar <span className="font-medium text-foreground">{ownerEmail}</span>, o e-mail de quem criou a conta.</>
          : "Deixe em branco para usar o e-mail de quem criou a conta."}
      </p>
    </form>
  );
}
