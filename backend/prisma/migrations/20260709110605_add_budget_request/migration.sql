-- CreateTable
CREATE TABLE "BudgetRequest" (
    "id" TEXT NOT NULL,
    "bgtNo" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "department" TEXT NOT NULL,
    "endUser" TEXT NOT NULL,
    "position" TEXT,
    "category" TEXT,
    "items" JSONB NOT NULL,
    "preparedBy" TEXT,
    "checkedBy" TEXT,
    "receivedBy" TEXT,
    "approvedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subTitle" TEXT,
    "remarks" TEXT,
    "signatoryConfig" JSONB,
    "customSubHeader" TEXT,

    CONSTRAINT "BudgetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetRequest_bgtNo_key" ON "BudgetRequest"("bgtNo");
