import { Quote } from "lucide-react";

const testimonials = [
  {
    text: "Antes usávamos lista impressa e uma pessoa ficava riscando nome por nome. Com o Peltrack, a entrada de 300 alunos na formatura foi em menos de 20 minutos. Não tem comparação.",
    name: "Prof. Adriana Costa",
    role: "Coordenadora de Eventos",
    org: "Faculdade de Engenharia — SP",
    initials: "AC",
    color: "bg-laranja",
  },
  {
    text: "O que mais me surpreendeu foi a lista de espera automática. Tivemos 12 cancelamentos na semana do evento e as vagas foram preenchidas sozinhas, sem eu precisar fazer nada.",
    name: "Rafael Mendonça",
    role: "Gerente de RH",
    org: "Empresa de tecnologia — MG",
    initials: "RM",
    color: "bg-grafite-light",
  },
  {
    text: "Rodamos 3 eventos no mesmo final de semana com equipes diferentes. O painel mostrava tudo em tempo real e consegui monitorar os três do notebook enquanto circulava pelo espaço.",
    name: "Beatriz Almeida",
    role: "Produtora de Eventos",
    org: "BH Eventos — BH",
    initials: "BA",
    color: "bg-grafite-muted",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-14">
          <span className="text-laranja text-sm font-semibold uppercase tracking-widest">
            Depoimentos
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Quem usa, recomenda
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-fundo rounded-2xl p-7 border border-border flex flex-col justify-between hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div>
                <Quote className="w-7 h-7 text-laranja/30 mb-4" />
                <p className="text-foreground text-sm leading-relaxed mb-6">
                  "{t.text}"
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{t.initials}</span>
                </div>
                <div>
                  <p className="text-foreground font-semibold text-sm">{t.name}</p>
                  <p className="text-muted-foreground text-xs">{t.role} · {t.org}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
