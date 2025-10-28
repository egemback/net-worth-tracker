/*
  Warnings:

  - You are about to drop the column `date` on the `Snapshot` table. All the data in the column will be lost.
  - Added the required column `month` to the `Snapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Snapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `Snapshot` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Snapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "netWorth" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Extract year and month from existing date field, use current date if null
INSERT INTO "new_Snapshot" ("id", "year", "month", "netWorth", "notes", "createdAt", "updatedAt") 
SELECT 
    "id", 
    CAST(strftime('%Y', COALESCE("date", CURRENT_TIMESTAMP)) AS INTEGER) as "year",
    CAST(strftime('%m', COALESCE("date", CURRENT_TIMESTAMP)) AS INTEGER) as "month",
    "netWorth", 
    "notes",
    COALESCE("date", CURRENT_TIMESTAMP) as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "Snapshot";
DROP TABLE "Snapshot";
ALTER TABLE "new_Snapshot" RENAME TO "Snapshot";
CREATE UNIQUE INDEX "Snapshot_year_month_key" ON "Snapshot"("year", "month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
