-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLICO', 'RESTRITO');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'RESTRITO';
