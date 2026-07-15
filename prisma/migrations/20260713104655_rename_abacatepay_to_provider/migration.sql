-- Renomeia a coluna do id do gateway (AbacatePay -> Mercado Pago), preservando os dados.
ALTER TABLE "Payment" RENAME COLUMN "abacatePayId" TO "providerId";
ALTER INDEX "Payment_abacatePayId_key" RENAME TO "Payment_providerId_key";
