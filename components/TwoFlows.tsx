import { QrCode, Mail, ScanLine, ArrowRight, FileSpreadsheet, Usb, CheckSquare } from "lucide-react";

const flowA = [
  { icon: QrCode,        label: "Convidado confirma presença no link" },
  { icon: Mail,          label: "QR Code único enviado por e-mail" },
  { icon: ScanLine,      label: "Scan na entrada com câmera do celular" },
  { icon: CheckSquare,   label: "Acesso validado em tempo real" },
];

const flowB = [
  { icon: FileSpreadsheet, label: "Importação da lista de alunos via Excel" },
  { icon: Usb,             label: "Leitor USB de código de barras" },
  { icon: CheckSquare,     label: "Presença registrada com feedback visual" },
];

export default function TwoFlows() {
  return (
    <section className="py-24 bg-fundo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-laranja text-sm font-semibold uppercase tracking-widest">
            Modos de operação
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Dois fluxos, uma plataforma
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Escolha o modo que melhor se adapta ao seu evento — ou use os dois ao mesmo tempo.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flow A — QR Code */}
          <div className="bg-grafite rounded-2xl p-8 border border-white/10 relative overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-laranja/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-laranja flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <span className="text-laranja text-xs font-bold uppercase tracking-widest">Principal</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Fluxo QR Code</h3>
              <p className="text-white/50 text-sm mb-8 leading-relaxed">
                Ideal para eventos com convite digital e confirmação online. Sem impressão, sem burocracia.
              </p>

              <div className="space-y-3">
                {flowA.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-laranja" />
                      </div>
                      {i < flowA.length - 1 && (
                        <div className="w-px h-4 bg-white/10 mt-1" />
                      )}
                    </div>
                    <span className="text-white/80 text-sm">{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flow B — Excel */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-muted rounded-full blur-2xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-grafite flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                </div>
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Legado / Offline</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Fluxo Lista Excel</h3>
              <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                Compatível com o app desktop. Perfeito para eventos sem internet ou com listas pré-existentes.
              </p>

              <div className="space-y-3">
                {flowB.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-fundo border border-border flex items-center justify-center">
                        <step.icon className="w-4 h-4 text-foreground" />
                      </div>
                      {i < flowB.length - 1 && (
                        <div className="w-px h-4 bg-muted mt-1" />
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">{step.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-muted-foreground text-sm border-t border-border pt-6">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                App Desktop disponível para download na plataforma
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
