"use client";

/**
 * Papel do usuário na organização, disponível para os componentes de tela.
 * Quem resolve é o layout do dashboard (servidor), que já consultava o banco
 * para a trava de suspensão. Assim não custa consulta nova e o papel chega
 * atualizado a cada navegação, sem depender do que está no token da sessão.
 *
 * IMPORTANTE: esconder botão NÃO é segurança. Toda ação restrita também é
 * barrada no servidor, em getOwnerTenantId. Isto aqui é só para o operador não
 * ver portas que não abrem.
 */
import { createContext, useContext } from "react";

export type Papel = "DONO" | "OPERADOR";

/**
 * ⚠️ O PADRÃO É O MAIS RESTRITO, DE PROPÓSITO.
 * Antes era DONO, e em 17/08 isso mordeu: uma sessão que o servidor não
 * conseguiu resolver caiu no padrão e a barra lateral mostrou Financeiro e
 * Configurações, enquanto a API recusava tudo. O menu prometeu porta que o
 * servidor fechava, e a pessoa concluiu que tinha sido rebaixada.
 * Na dúvida, mostrar de menos. Quem é dono de verdade sempre chega com o papel
 * resolvido pelo layout.
 */
const PapelContext = createContext<Papel>("OPERADOR");

export function PapelProvider({ papel, children }: { papel: Papel; children: React.ReactNode }) {
  return <PapelContext.Provider value={papel}>{children}</PapelContext.Provider>;
}

export const usePapel = () => useContext(PapelContext);
export const useEhDono = () => useContext(PapelContext) === "DONO";
