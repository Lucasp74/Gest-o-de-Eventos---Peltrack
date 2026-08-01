/**
 * Regra de tamanho mínimo de senha — aplicada só a senhas NOVAS
 * (cadastro e troca). O login NÃO usa isto: senhas antigas mais curtas
 * continuam válidas, só o hash é que manda no login.
 */
export const MIN_PASSWORD = 8;
