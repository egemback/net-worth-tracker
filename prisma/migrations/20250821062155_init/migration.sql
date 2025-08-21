/*
  Warnings:

  - You are about to drop the column `minimumPay` on the `Liability` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "monthlyContribution" DECIMAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Liability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL,
    "interestRate" REAL,
    "monthlyPayment" DECIMAL,
    "termMonths" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Liability" ("balance", "category", "createdAt", "id", "interestRate", "name", "updatedAt") SELECT "balance", "category", "createdAt", "id", "interestRate", "name", "updatedAt" FROM "Liability";
DROP TABLE "Liability";
ALTER TABLE "new_Liability" RENAME TO "Liability";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
