import { Settings2, Share2, ScanLine, FileDown } from "lucide-react";

const steps = [
  {
    icon: Settings2,
    step: "01",
    title: "Configure o evento",
    description: "Defina o nome, data, local, capacidade máxima e os campos que o convidado vai preencher. Pronto em menos de 5 minutos.",
    detail: ["Capacidade máxima", "Campos personalizados", "Data e local"],
  },
  {
    icon: Share2,
    step: "02",
    title: "Compartilhe o link",
    description: "Envie o link de confirmação por e-mail, WhatsApp ou qualquer canal. Cada convidado que confirmar recebe um QR Code exclusivo por e-mail.",
    detail: ["Link público único", "QR Code automático", "E-mail de confirmação"],
  },
  {
    icon: ScanLine,
    step: "03",
    title: "Controle a entrada",
    description: "No dia do evento, abra o scanner no celular e leia os QR Codes. O sistema valida, registra e exibe o nome do convidado na tela em tempo real.",
    detail: ["Scanner pela câmera", "Feedback imediato", "Múltiplos guichês"],
  },
  {
    icon: FileDown,
    step: "04",
    title: "Exporte o relatório",
    description: "Ao encerrar, exporte a lista completa de presentes com nome, horário de entrada e terminal. Excel formatado, pronto para usar.",
    detail: ["Excel formatado", "Horário de cada entrada", "Por terminal"],
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-fundo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-xl mb-16">
          <span className="text-laranja text-sm font-semibold uppercase tracking-widest">
            Como funciona
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            De zero ao evento controlado em quatro passos
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={step.step} className="relative">
              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-laranja/30 to-transparent z-10 -translate-x-1/2" />
              )}

              <div className="bg-card rounded-2xl p-6 border border-border h-full hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                {/* Step number + icon */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-laranja flex items-center justify-center flex-shrink-0 shadow-md shadow-laranja/25">
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-3xl font-black text-foreground/10 select-none leading-none">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-foreground font-bold text-base mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                  {step.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {step.detail.map((d) => (
                    <span
                      key={d}
                      className="text-xs bg-fundo border border-border text-muted-foreground px-2.5 py-1 rounded-full"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
