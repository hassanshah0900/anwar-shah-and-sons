-- AlterEnum
ALTER TYPE "payment_method" ADD VALUE 'card';

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('unpaid', 'paid', 'refunded');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "payment_status" "payment_status" NOT NULL DEFAULT 'unpaid',
ADD COLUMN     "stripe_payment_intent_id" TEXT,
ADD COLUMN     "stripe_session_id" TEXT;

-- Cash orders already delivered have been paid for.
UPDATE "orders" SET "payment_status" = 'paid' WHERE "status" = 'delivered';

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_session_id_key" ON "orders"("stripe_session_id");
