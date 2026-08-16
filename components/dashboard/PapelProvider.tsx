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

const PapelContext = createContext<Papel>("DONO");

export function PapelProvider({ papel, children }: { papel: Papel; children: React.ReactNode }) {
  return <PapelContext.Provider value={papel}>{children}</PapelContext.Provider>;
}

/** Padrão DONO quando não há provider, para nada quebrar fora do dashboard. */
export const usePapel = () => useContext(PapelContext);
export const useEhDono = () => useContext(PapelContext) === "DONO";
