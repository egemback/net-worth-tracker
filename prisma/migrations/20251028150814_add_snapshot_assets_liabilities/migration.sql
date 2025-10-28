/*
  Warnings:

  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Liability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `notes` on the `Snapshot` table. All the data in the column will be lost.
  - You are about to alter the column `netWorth` on the `Snapshot` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Float`.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Asset";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Liability";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "SnapshotAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "assetId" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "growthRate" REAL,
    "monthlyContribution" REAL,
    CONSTRAINT "SnapshotAsset_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SnapshotLiability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "liabilityId" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "interestRate" REAL,
    "monthlyPayment" REAL,
    "termMonths" INTEGER,
    CONSTRAINT "SnapshotLiability_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "netWorth" REAL
);
INSERT INTO "new_Snapshot" ("createdAt", "id", "month", "netWorth", "updatedAt", "year") SELECT "createdAt", "id", "month", "netWorth", "updatedAt", "year" FROM "Snapshot";
DROP TABLE "Snapshot";
ALTER TABLE "new_Snapshot" RENAME TO "Snapshot";
CREATE UNIQUE INDEX "Snapshot_year_month_key" ON "Snapshot"("year", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
