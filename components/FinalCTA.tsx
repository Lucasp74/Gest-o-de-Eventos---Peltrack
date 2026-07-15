import { ArrowRight, ShieldCheck, Clock, Headphones } from "lucide-react";

const trust = [
  { icon: ShieldCheck, label: "Dados isolados por cliente" },
  { icon: Clock,       label: "99,9% de disponibilidade" },
  { icon: Headphones,  label: "Suporte em português" },
];

export default function FinalCTA() {
  return (
    <section className="py-24 bg-grafite">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main CTA */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4 leading-tight">
            Seu próximo evento com controle
            <br className="hidden sm:block" />
            <span className="text-laranja"> de acesso de verdade</span>
          </h2>
          <p className="text-white/50 text-base mb-8 max-w-lg mx-auto leading-relaxed">
            Configure em minutos. Use no evento. Exporte o relatório. Sem complicação, sem infraestrutura própria.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/cadastro"
              className="flex items-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-200 text-sm shadow-xl shadow-laranja/25 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
            >
              Criar conta grátis
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/login"
              className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/70 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-all duration-200 text-sm w-full sm:w-auto justify-center"
            >
              Já tenho conta — Entrar
            </a>
          </div>
          <p className="text-white/25 text-xs mt-4">
            Plano gratuito disponível · Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>

        {/* Trust signals */}
        <div className="border-t border-white/8 pt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/6 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white/50" />
              </div>
              <span className="text-white/50 text-sm">{label}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
