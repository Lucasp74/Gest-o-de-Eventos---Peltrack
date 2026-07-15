import type { Metadata } from "next";
import ConfirmationFlow from "@/components/public/ConfirmationFlow";

export const metadata: Metadata = {
  title: "Confirmar presença — Peltrack",
  description: "Confirme sua presença e receba seu convite com QR Code.",
};

export default async function ConfirmacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConfirmationFlow eventId={id} />;
}
