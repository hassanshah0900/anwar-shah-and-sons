-- AlterTable
ALTER TABLE "products" ADD COLUMN     "rating_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_product_id_created_at_idx" ON "reviews"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_rating_created_at_idx" ON "reviews"("rating", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_product_id_user_id_key" ON "reviews"("product_id", "user_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ratings run from 1 to 5 stars.
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "products" ADD CONSTRAINT "products_review_count_check" CHECK ("review_count" >= 0);

-- Keeps each product's review count and rating total in step with its reviews,
-- however they change (including reviews removed with a deleted account).
CREATE FUNCTION "reviews_update_product_rating"() RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE "products"
      SET "review_count" = "review_count" + 1, "rating_total" = "rating_total" + NEW."rating"
      WHERE "id" = NEW."product_id";
  END IF;
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    UPDATE "products"
      SET "review_count" = "review_count" - 1, "rating_total" = "rating_total" - OLD."rating"
      WHERE "id" = OLD."product_id";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reviews_product_rating"
  AFTER INSERT OR DELETE OR UPDATE OF "rating", "product_id" ON "reviews"
  FOR EACH ROW EXECUTE FUNCTION "reviews_update_product_rating"();
