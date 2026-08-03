-- CreateTable
CREATE TABLE "RepairPrice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleType" TEXT NOT NULL,
    "partTh" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "minor" REAL,
    "moderate" REAL,
    "severe" REAL,
    "replace" REAL,
    "note" TEXT
);

-- CreateIndex
CREATE INDEX "RepairPrice_partTh_idx" ON "RepairPrice"("partTh");

-- CreateIndex
CREATE UNIQUE INDEX "RepairPrice_vehicleType_partTh_size_key" ON "RepairPrice"("vehicleType", "partTh", "size");
