-- CreateTable
CREATE TABLE "public"."Apparel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fabricId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apparel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Apparel_name_key" ON "public"."Apparel"("name");

-- AddForeignKey
ALTER TABLE "public"."Apparel" ADD CONSTRAINT "Apparel_fabricId_fkey" FOREIGN KEY ("fabricId") REFERENCES "public"."Fabric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
