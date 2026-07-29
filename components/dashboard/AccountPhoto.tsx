"use client";

/**
 * Avatar da conta com upload de foto de perfil.
 * A imagem é redimensionada no navegador para um quadrado de 256×256 e recomprimida
 * (JPEG) ANTES de subir — então o arquivo salvo fica pequeno, independentemente do
 * original. Rejeita não-imagem e arquivos acima de 5MB. Salva a URL em user.image.
 */
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Camera, Loader2, Mail, UserRound } from "lucide-react";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB no original
const SIZE = 256; // avatar final (quadrado)

/** Recorta no centro (quadrado) e redimensiona para 256×256, devolvendo um JPEG comprimido. */
async function resizeSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const min = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - min) / 2;
  const sy = (bitmap.height - min) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(bitmap, sx, sy, min, min, 0, 0, SIZE, SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("falha ao gerar imagem"))), "image/jpeg", 0.85),
  );
}

export default function AccountPhoto({
  initialImage, name, email,
}: {
  initialImage: string | null;
  name: string | null;
  email: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initialImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reescolher o mesmo arquivo depois
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) return setError("Selecione um arquivo de imagem.");
    if (file.size > MAX_BYTES) return setError("Imagem muito grande (máx. 5MB).");

    setBusy(true);
    try {
      const blob = await resizeSquare(file);
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData.error ?? "upload");

      const save = await fetch("/api/account/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: upData.url }),
      });
      if (!save.ok) throw new Error("save");

      setImage(upData.url);
      // atualiza a sessão → o avatar do sidebar troca na hora (sem novo login)
      update({ image: upData.url }).catch(() => {});
      router.refresh();
    } catch {
      setError("Não foi possível atualizar a foto. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Alterar foto de perfil"
        className="relative w-14 h-14 rounded-full bg-laranja flex items-center justify-center overflow-hidden flex-shrink-0 group"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="w-full h-full object-cover" />
        ) : (
          <UserRound className="w-7 h-7 text-white" />
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {busy ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-foreground font-semibold text-lg truncate">{name ?? "—"}</p>
        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> {email ?? "—"}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-1 text-laranja hover:text-laranja-dark text-xs font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Enviando..." : "Alterar foto"}
        </button>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </div>
  );
}
