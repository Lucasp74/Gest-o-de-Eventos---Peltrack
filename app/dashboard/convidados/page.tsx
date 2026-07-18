import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import EventScopedView from "@/components/dashboard/EventScopedView";

export const metadata: Metadata = {
  title: "Convidados — Peltrack",
};

export default function ConvidadosPage() {
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <EventScopedView kind="guests" />
      </div>
    </div>
  );
}
