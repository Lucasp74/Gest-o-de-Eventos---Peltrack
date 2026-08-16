import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import FinanceView from "@/components/dashboard/FinanceView";
import { getCurrentMembership } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Financeiro — Peltrack",
};

export default async function FinanceiroPage() {
  // Esconder o item da barra não basta: o operador pode digitar a URL. A API já
  // recusaria, mas ele veria uma tela quebrada em vez de entender o motivo.
  const vinculo = await getCurrentMembership();
  if (vinculo && vinculo.papel !== "DONO") redirect("/dashboard");
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <FinanceView />
      </div>
    </div>
  );
}
