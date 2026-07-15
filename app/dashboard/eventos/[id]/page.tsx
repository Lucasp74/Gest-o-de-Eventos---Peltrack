import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import EventManageView from "@/components/dashboard/EventManageView";

export const metadata: Metadata = {
  title: "Gerenciar evento — Peltrack",
};

export default async function GerenciarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <EventManageView id={id} />
      </div>
    </div>
  );
}
