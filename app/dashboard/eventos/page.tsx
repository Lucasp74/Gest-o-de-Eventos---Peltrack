import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import EventsView from "@/components/dashboard/EventsView";

export const metadata: Metadata = {
  title: "Meus eventos — Peltrack",
};

export default function EventosPage() {
  return (
    <div className="min-h-screen bg-fundo">
      <Sidebar />
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <EventsView />
      </div>
    </div>
  );
}
