import { ArrowRight, CheckCircle2 } from "lucide-react";

const proof = [
  "Formaturas",
  "Congressos",
  "Eventos corporativos",
  "Palestras universitárias",
  "Feiras e exposições",
  "Treinamentos internos",
];

const checks = [
  "Sem filas na entrada",
  "Sem planilhas manuais",
  "Sem duplo registro",
];

export default function Hero() {
  return (
    <section className="bg-grafite pt-16 min-h-dvh flex flex-col">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10 w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-laranja/10 border border-laranja/20 text-laranja text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              Controle de acesso em tempo real
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.15] tracking-tight mb-6">
              Do convite ao check-in,{" "}
              <span className="text-laranja">sem margem para erro</span>
            </h1>

            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg">
              Gere QR Codes únicos para cada convidado, controle a capacidade em tempo real e monitore a entrada de múltiplos guichês simultaneamente — tudo em uma plataforma.
            </p>

            {/* Checks */}
            <ul className="space-y-2.5 mb-10">
              {checks.map((c) => (
                <li key={c} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-laranja flex-shrink-0" />
                  <span className="text-white/70 text-sm">{c}</span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/cadastro"
                className="flex items-center justify-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-laranja/25 hover:-translate-y-0.5"
              >
                Criar conta grátis
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href="#como-funciona"
                className="flex items-center justify-center gap-2 border border-white/15 hover:border-white/30 text-white/80 hover:text-white font-medium px-7 py-3.5 rounded-xl transition-all duration-200 text-sm"
              >
                Ver como funciona
              </a>
            </div>
          </div>

          {/* Right — product mockup */}
          <div className="relative">
            {/* Main dashboard card */}
            <div className="bg-[#141c2b] rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/50">

              {/* Top bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-white/3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/50" />
                </div>
                <span className="text-white/25 text-xs font-mono">
                  app.peltrack.com.br · Scanner ao vivo
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs font-medium">Online</span>
                </div>
              </div>

              <div className="p-5 space-y-4">

                {/* Event header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">Evento ativo</p>
                    <p className="text-white font-semibold text-base">Formatura Engenharia — Turma 2024</p>
                  </div>
                  <span className="bg-green-500/15 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-500/20">
                    Em andamento
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Confirmados", value: "248", color: "text-white" },
                    { label: "Presentes", value: "187", color: "text-green-600" },
                    { label: "Aguardando", value: "61", color: "text-white/50" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/4 rounded-xl p-3 border border-white/6">
                      <p className="text-white/40 text-xs mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/40">Ocupação</span>
                    <span className="text-white/60 font-medium">75% · 187/248</span>
                  </div>
                  <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-laranja rounded-full transition-all"
                      style={{ width: "75%" }}
                    />
                  </div>
                </div>

                {/* Terminals */}
                <div className="space-y-2">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Guichês ativos</p>
                  {[
                    { name: "Guichê 1 — Entrada Principal", count: 112, active: true },
                    { name: "Guichê 2 — Entrada Lateral", count: 75, active: true },
                  ].map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center justify-between bg-white/4 rounded-lg px-3.5 py-2.5 border border-white/6"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.active ? "bg-green-400" : "bg-white/20"}`} />
                        <span className="text-white/70 text-xs">{t.name}</span>
                      </div>
                      <span className="text-white/50 text-xs font-mono">{t.count} entradas</span>
                    </div>
                  ))}
                </div>

                {/* Last scan */}
                <div className="bg-green-500/8 border border-green-500/15 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">Último acesso</p>
                    <span className="text-white/30 text-xs">21:47:03</span>
                  </div>
                  <p className="text-white font-semibold text-sm">Mariana Fernandes Oliveira</p>
                  <p className="text-white/40 text-xs mt-0.5">Engenharia Civil · Guichê 1 · Acesso liberado</p>
                </div>

              </div>
            </div>

            {/* Floating scan card */}
            <div className="absolute -bottom-5 -left-5 bg-card rounded-2xl shadow-2xl shadow-black/30 p-4 border border-border w-52">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-laranja/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-laranja" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" stroke="none" />
                  </svg>
                </div>
                <div>
                  <p className="text-foreground font-bold text-sm">QR Lido</p>
                  <p className="text-green-600 text-xs font-medium">✓ Acesso liberado</p>
                </div>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-laranja rounded-full w-3/4" />
              </div>
              <p className="text-muted-foreground text-xs mt-1.5 text-right">resposta em 80ms</p>
            </div>
          </div>
        </div>

        {/* Event types strip */}
        <div className="border-t border-white/8 mt-20 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <span className="text-white/25 text-xs uppercase tracking-widest">Usado em</span>
            {proof.map((p) => (
              <span key={p} className="text-white/40 text-sm font-medium hover:text-white/60 transition-colors">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
