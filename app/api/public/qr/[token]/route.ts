/**
 * Gera o QR Code (PNG) de um convite no servidor, a partir do token.
 * Usado para exibir o QR inline no corpo do e-mail do convite.
 * O token JÁ É o segredo (quem o tem, tem o convite) — renderizar seu QR
 * não expõe nada a mais.
 */
import QRCode from "qrcode";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return new Response("Token ausente.", { status: 400 });

  const png = await QRCode.toBuffer(token, {
    type: "png",
    width: 300,
    margin: 1,
    color: { dark: "#1E2535", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
