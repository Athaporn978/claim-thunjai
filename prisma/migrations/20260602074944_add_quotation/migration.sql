-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "customerName" TEXT,
    "licensePlate" TEXT,
    "vehicleCategory" TEXT,
    "vehicleBrand" TEXT,
    "vehicleYear" INTEGER,
    "chassisNo" TEXT,
    "color" TEXT,
    "mileage" INTEGER,
    "insurerName" TEXT,
    "claimNo" TEXT,
    "insVehicleType" TEXT,
    "policyNo" TEXT,
    "policyType" TEXT,
    "sumInsured" REAL,
    "coverageStart" DATETIME,
    "coverageEnd" DATETIME,
    "deductible" REAL,
    "centerName" TEXT,
    "centerAddress" TEXT,
    "centerContact" TEXT,
    "vehicleSize" TEXT NOT NULL DEFAULT 'B',
    "totalQuoted" REAL NOT NULL DEFAULT 0,
    "totalControlled" REAL NOT NULL DEFAULT 0,
    "totalSaving" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quotationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quotedUnit" REAL NOT NULL DEFAULT 0,
    "quotedQty" REAL NOT NULL DEFAULT 1,
    "controlledUnit" REAL NOT NULL DEFAULT 0,
    "controlledQty" REAL NOT NULL DEFAULT 1,
    "standardPrice" REAL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNo_key" ON "Quotation"("quotationNo");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");
