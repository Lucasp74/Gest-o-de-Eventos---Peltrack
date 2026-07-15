import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Entrar — Peltrack",
  description: "Acesse sua conta Peltrack para gerenciar seus eventos.",
};

export default function LoginPage() {
  return <LoginForm />;
}
