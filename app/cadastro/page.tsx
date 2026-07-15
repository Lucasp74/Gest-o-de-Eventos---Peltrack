import type { Metadata } from "next";
import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Criar conta — Peltrack",
  description: "Crie sua conta grátis no Peltrack e comece a gerenciar seus eventos.",
};

export default function CadastroPage() {
  return <SignupForm />;
}
