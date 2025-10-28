-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "growthRate" REAL,
    "monthlyContribution" DECIMAL,
    "snapshotId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Asset" ("category", "createdAt", "currency", "growthRate", "id", "monthlyContribution", "name", "updatedAt", "value") SELECT "category", "createdAt", "currency", "growthRate", "id", "monthlyContribution", "name", "updatedAt", "value" FROM "Asset";
DROP TABLE "Asset";
ALTER TABLE "new_Asset" RENAME TO "Asset";
CREATE TABLE "new_Liability" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "balance" DECIMAL NOT NULL,
    "interestRate" REAL,
    "monthlyPayment" DECIMAL,
    "termMonths" INTEGER,
    "snapshotId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Liability_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Liability" ("balance", "category", "createdAt", "id", "interestRate", "monthlyPayment", "name", "termMonths", "updatedAt") SELECT "balance", "category", "createdAt", "id", "interestRate", "monthlyPayment", "name", "termMonths", "updatedAt" FROM "Liability";
DROP TABLE "Liability";
ALTER TABLE "new_Liability" RENAME TO "Liability";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
