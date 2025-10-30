/*
  Warnings:

  - You are about to drop the column `isLiquid` on the `Asset` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "assetId" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "growthRate" REAL,
    "monthlyContribution" REAL,
    "riskLevel" INTEGER DEFAULT 2,
    "notes" TEXT,
    CONSTRAINT "Asset_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("assetId", "category", "growthRate", "id", "monthlyContribution", "name", "notes", "riskLevel", "snapshotId", "value") SELECT "assetId", "category", "growthRate", "id", "monthlyContribution", "name", "notes", "riskLevel", "snapshotId", "value" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
