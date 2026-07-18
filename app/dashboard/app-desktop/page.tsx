import type { Metadata } from "next";
import { Monitor } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  title: "App Desktop — Peltrack",
};

export default function AppDesktopPage() {
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">App Desktop</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Leitura de QR Code no computador, mesmo sem internet.
            </p>
          </div>

          <div className="mt-6 bg-card rounded-2xl border border-dashed border-border py-20 px-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-laranja/10 flex items-center justify-center mb-4">
              <Monitor className="w-7 h-7 text-laranja" />
            </div>
            <h3 className="text-foreground font-semibold text-base mb-1">Em breve</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              O aplicativo para computador vai permitir validar ingressos mesmo offline,
              sincronizando os check-ins automaticamente quando a conexão voltar.
              Estamos construindo — chega em breve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
