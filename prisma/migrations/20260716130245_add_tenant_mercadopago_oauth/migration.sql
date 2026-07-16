-- Conexão do organizador com o Mercado Pago (split de pagamento via OAuth).
ALTER TABLE "Tenant" ADD COLUMN "mpUserId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "mpAccessToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "mpRefreshToken" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "mpTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN "mpConnectedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Tenant_mpUserId_key" ON "Tenant"("mpUserId");
