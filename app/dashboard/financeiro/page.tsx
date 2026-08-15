import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import FinanceView from "@/components/dashboard/FinanceView";

export const metadata: Metadata = {
  title: "Financeiro — Peltrack",
};

export default function FinanceiroPage() {
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <FinanceView />
      </div>
    </div>
  );
}
