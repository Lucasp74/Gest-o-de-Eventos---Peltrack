/**
 * Upload de imagem do evento. Restrito ao cliente logado.
 * Produção: envia para o Vercel Blob (BLOB_READ_WRITE_TOKEN).
 * Dev (sem token): salva local em public/uploads e devolve /uploads/...
 * Devolve { url } — o link é gravado em event.imageUrl.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { getCurrentTenantId } from "@/lib/tenant";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Imagem muito grande (máx. 5MB)." }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`eventos/${filename}`, file, { access: "public" });
      return NextResponse.json({ url: blob.url });
    }
    // Fallback de desenvolvimento — grava no disco local
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar a imagem." }, { status: 500 });
  }
}
