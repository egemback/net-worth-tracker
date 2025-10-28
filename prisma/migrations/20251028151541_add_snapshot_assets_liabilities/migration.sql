/*
  Warnings:

  - You are about to drop the `SnapshotAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SnapshotLiability` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SnapshotAsset";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SnapshotLiability";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "assetId" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "growthRate" REAL,
    "monthlyContribution" REAL,
    CONSTRAINT "Asset_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Liability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "liabilityId" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "balance" REAL NOT NULL,
    "interestRate" REAL,
    "monthlyPayment" REAL,
    "termMonths" INTEGER,
    CONSTRAINT "Liability_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
