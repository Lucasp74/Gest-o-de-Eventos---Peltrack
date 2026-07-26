import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Monitor, Download, ShieldAlert, CheckCircle2, ScanLine, WifiOff } from "lucide-react";
import { auth } from "@/auth";
import Sidebar from "@/components/dashboard/Sidebar";
import { desktopApp } from "@/lib/desktopApp";

export const metadata: Metadata = {
  title: "App Desktop — Peltrack",
};

const recursos = [
  { icon: ScanLine, texto: "Check-in por QR Code com leitor USB" },
  { icon: WifiOff, texto: "Funciona offline — sincroniza quando a internet volta" },
  { icon: CheckCircle2, texto: "Lista de convidados e relatórios do evento" },
];

const passos = [
  "Baixe o instalador e execute o arquivo.",
  'Se o Windows exibir "Windows protegeu o seu PC", clique em "Mais informações" e depois em "Executar assim mesmo".',
  "Siga o instalador e abra o Peltrack. Entre com o mesmo e-mail e senha do site.",
];

export default async function AppDesktopPage() {
  // Área logada — sem sessão, volta para o login.
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">App Desktop</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Leitura de QR Code no computador, com check-in mesmo sem internet.
            </p>
          </div>

          {/* Card principal — download */}
          <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-laranja/10 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-8 h-8 text-laranja" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-foreground font-bold text-lg">Peltrack para Windows</h2>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Versão {desktopApp.version} · {desktopApp.sizeLabel} · {desktopApp.os}
                </p>
              </div>
              <a
                href={desktopApp.downloadUrl}
                className="flex items-center justify-center gap-2 bg-laranja hover:bg-laranja-dark text-white font-semibold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-laranja/25 flex-shrink-0"
              >
                <Download className="w-4 h-4" />
                Baixar para Windows
              </a>
            </div>

            {/* Recursos */}
            <ul className="mt-6 pt-6 border-t border-border grid sm:grid-cols-3 gap-4">
              {recursos.map((r) => (
                <li key={r.texto} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <r.icon className="w-4 h-4 text-laranja mt-0.5 flex-shrink-0" />
                  {r.texto}
                </li>
              ))}
            </ul>
          </div>

          {/* Como instalar */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="text-foreground font-semibold mb-4">Como instalar</h3>
            <ol className="space-y-3">
              {passos.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="w-6 h-6 rounded-full bg-fundo border border-border flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{p}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Aviso — app não assinado + requisito de plano */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              O aplicativo ainda não é assinado digitalmente, então o Windows pode exibir um aviso na
              primeira execução — é esperado e seguro seguir. O uso do app requer um plano com o
              recurso de desktop habilitado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
