-- Feature 2: compra de múltiplos ingressos por pedido + mín/máx.
-- Passa a relação Payment↔Confirmation de 1:1 para 1:N (uma compra = N QRs)
-- e remove o índice único (evento, e-mail) da Confirmation.

-- TicketType: limites de quantidade por compra (maxPerOrder 0 = sem limite)
ALTER TABLE "TicketType" ADD COLUMN "minPerOrder" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "TicketType" ADD COLUMN "maxPerOrder" INTEGER NOT NULL DEFAULT 0;

-- Payment: quantidade comprada
ALTER TABLE "Payment" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- Confirmation: novo vínculo N:1 com Payment
ALTER TABLE "Confirmation" ADD COLUMN "paymentId" TEXT;

-- Backfill: preserva os vínculos existentes (Payment.confirmationId -> Confirmation.paymentId)
UPDATE "Confirmation" c
SET "paymentId" = p."id"
FROM "Payment" p
WHERE p."confirmationId" = c."id";

-- Remove o vínculo antigo 1:1 de Payment
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_confirmationId_fkey";
DROP INDEX IF EXISTS "Payment_confirmationId_key";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "confirmationId";

-- Remove o índice único (evento, e-mail) — um comprador pode ter vários QRs no evento
DROP INDEX IF EXISTS "Confirmation_eventId_email_key";

-- Índice + FK do novo vínculo
CREATE INDEX "Confirmation_paymentId_idx" ON "Confirmation"("paymentId");
ALTER TABLE "Confirmation" ADD CONSTRAINT "Confirmation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
