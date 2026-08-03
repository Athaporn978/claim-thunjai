-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "intakeNo" TEXT NOT NULL,
    "fromEmail" TEXT,
    "subject" TEXT,
    "emailBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "customer" TEXT,
    "licensePlate" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "claimNumber" TEXT,
    "policyNo" TEXT,
    "insurer" TEXT,
    "centerName" TEXT,
    "centerContact" TEXT,
    "photos" TEXT,
    "analysis" TEXT,
    "missing" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Intake_intakeNo_key" ON "Intake"("intakeNo");
