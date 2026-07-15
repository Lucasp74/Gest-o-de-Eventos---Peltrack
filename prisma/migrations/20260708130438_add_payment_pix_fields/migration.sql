-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "brCode" TEXT,
ADD COLUMN     "buyerEmail" TEXT,
ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "feeAmount" DECIMAL(10,2);
