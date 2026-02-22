-- Add optional image storage for product cards.
ALTER TABLE "public"."Product"
ADD COLUMN "imageUrl" TEXT;
