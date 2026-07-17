-- Assinatura recorrente da mensalidade (Mercado Pago preapproval).
ALTER TABLE "Tenant" ADD COLUMN "subscriptionId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "subscriptionPlan" TEXT;
CREATE UNIQUE INDEX "Tenant_subscriptionId_key" ON "Tenant"("subscriptionId");
