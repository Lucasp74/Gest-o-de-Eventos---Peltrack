import { ImageResponse } from "next/og";

/**
 * Cartão de compartilhamento do SITE (1200x630).
 *
 * As páginas de evento ganharam o delas em 18/08, mas a home ficou de fora, e
 * peltrack.com colado no WhatsApp continuava saindo sem imagem.
 *
 * Não consulta banco nenhum: conteúdo fixo, então o Next gera uma vez e serve
 * estático. Sem capa fotográfica, o arquivo fica pequeno e nunca esbarra no
 * teto de ~300 KB que o WhatsApp usa para descartar preview em silêncio.
 *
 * ⚠️ O Satori exige display explícito em qualquer elemento com mais de um
 * filho, e não suporta z-index. Ver o cartão de evento para o histórico.
 */
export const alt = "Peltrack — Controle de acesso para eventos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRAFITE = "#1E2535";
const TEAL = "#1F8A7A";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "center", padding: 88, fontFamily: "sans-serif",
          background: `linear-gradient(135deg, ${GRAFITE} 0%, #16303a 55%, ${TEAL} 165%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 44 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: TEAL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: "#fff", fontWeight: 700 }}>
            P
          </div>
          <div style={{ display: "flex", fontSize: 40, color: "#fff", fontWeight: 700, letterSpacing: -0.5 }}>
            Pel<span style={{ color: TEAL }}>track</span>
          </div>
        </div>

        <div style={{ fontSize: 62, color: "#fff", fontWeight: 700, lineHeight: 1.15, maxWidth: 900 }}>
          Controle de acesso para quem leva eventos a sério
        </div>

        <div style={{ fontSize: 30, color: "#cfd6e4", marginTop: 26, maxWidth: 880, lineHeight: 1.4 }}>
          Do convite ao QR Code, tudo em uma plataforma. O app de portaria funciona mesmo sem internet.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 44 }}>
          <div style={{ width: 10, height: 10, borderRadius: 5, background: TEAL }} />
          <div style={{ fontSize: 26, color: TEAL, fontWeight: 600, letterSpacing: 1 }}>peltrack.com</div>
        </div>
      </div>
    ),
    size,
  );
}
