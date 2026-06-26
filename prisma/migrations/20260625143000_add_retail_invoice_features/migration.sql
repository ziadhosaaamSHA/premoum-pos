ALTER TABLE "Order" ADD COLUMN "customerPhone" TEXT;

ALTER TABLE "OrderItem" ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Sale" ADD COLUMN "customerPhone" TEXT;

ALTER TABLE "SaleItem" ADD COLUMN "isGift" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "RetailReturnExchange" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "saleId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reason" TEXT,
    "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exchangeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailReturnExchange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetailPaymentPlan" (
    "id" TEXT NOT NULL,
    "saleId" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "downPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(12,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "firstDueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailPaymentPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sale_customerPhone_idx" ON "Sale"("customerPhone");

CREATE UNIQUE INDEX "RetailReturnExchange_code_key" ON "RetailReturnExchange"("code");
CREATE INDEX "RetailReturnExchange_invoiceNo_idx" ON "RetailReturnExchange"("invoiceNo");
CREATE INDEX "RetailReturnExchange_customerPhone_idx" ON "RetailReturnExchange"("customerPhone");
CREATE INDEX "RetailReturnExchange_type_status_idx" ON "RetailReturnExchange"("type", "status");

CREATE UNIQUE INDEX "RetailPaymentPlan_saleId_key" ON "RetailPaymentPlan"("saleId");
CREATE INDEX "RetailPaymentPlan_invoiceNo_idx" ON "RetailPaymentPlan"("invoiceNo");
CREATE INDEX "RetailPaymentPlan_customerPhone_idx" ON "RetailPaymentPlan"("customerPhone");
CREATE INDEX "RetailPaymentPlan_status_idx" ON "RetailPaymentPlan"("status");

ALTER TABLE "RetailReturnExchange" ADD CONSTRAINT "RetailReturnExchange_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RetailReturnExchange" ADD CONSTRAINT "RetailReturnExchange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RetailPaymentPlan" ADD CONSTRAINT "RetailPaymentPlan_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RetailPaymentPlan" ADD CONSTRAINT "RetailPaymentPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
