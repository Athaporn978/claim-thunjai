-- CreateTable
CREATE TABLE "InspectionCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseNo" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customer" TEXT NOT NULL,
    "licensePlate" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "deliveryChannel" TEXT NOT NULL DEFAULT 'email',
    "emailSentAt" DATETIME,
    "shots" TEXT,
    "validation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "InspectionCase_caseNo_key" ON "InspectionCase"("caseNo");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionCase_token_key" ON "InspectionCase"("token");
