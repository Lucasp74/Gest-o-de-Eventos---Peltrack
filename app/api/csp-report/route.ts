/**
 * Coletor de violações do CSP, usado durante a etapa Report-Only.
 *
 * POR QUE EXISTE: testando na mão a gente só passa pelas telas que lembra.
 * Com este endpoint, os clientes de verdade reportam o que quebraria em
 * caminhos que não pensaríamos em abrir. É o que dá confiança para trocar
 * Report-Only pelo cabeçalho real depois.
 *
 * TEMPORÁRIO: some junto com a etapa 2, quando o CSP virar bloqueante.
 *
 * Público de propósito: o navegador envia o relatório sozinho, sem sessão. Só
 * registra em log, não grava nada no banco, então não há o que abusar além de
 * ruído. Responde 204 sempre, porque navegador nenhum lê a resposta.
 */
import { NextResponse } from "next/server";

/** Extensão de navegador dispara violação o tempo todo e não é problema nosso. */
const RUIDO = /^(chrome|moz|safari(-web)?)-extension:/i;

type Violacao = { documento?: string; diretiva?: string; bloqueado?: string };

/** Os dois formatos que os navegadores usam, normalizados no mesmo shape. */
function extrair(body: unknown): Violacao[] {
  // Reporting API moderna: [{ type: "csp-violation", body: {...} }]
  if (Array.isArray(body)) {
    return body
      .filter((r) => r?.type === "csp-violation" && r?.body)
      .map((r) => ({
        documento: r.body.documentURL,
        diretiva: r.body.effectiveDirective,
        bloqueado: r.body.blockedURL,
      }));
  }
  // Formato antigo: { "csp-report": {...} }
  const antigo = (body as { "csp-report"?: Record<string, string> })?.["csp-report"];
  if (antigo) {
    return [{
      documento: antigo["document-uri"],
      diretiva: antigo["violated-directive"],
      bloqueado: antigo["blocked-uri"],
    }];
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    for (const v of extrair(body)) {
      if (v.bloqueado && RUIDO.test(v.bloqueado)) continue;
      console.warn("[csp]", {
        diretiva: v.diretiva ?? "?",
        bloqueado: v.bloqueado || "(inline)",
        pagina: v.documento ?? "?",
      });
    }
  } catch {
    // Relatório malformado não pode virar erro 500 no nosso log.
  }
  return new NextResponse(null, { status: 204 });
}
