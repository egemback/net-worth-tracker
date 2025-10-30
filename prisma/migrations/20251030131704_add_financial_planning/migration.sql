-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "isLiquid" BOOLEAN DEFAULT false;
ALTER TABLE "Asset" ADD COLUMN "notes" TEXT;
ALTER TABLE "Asset" ADD COLUMN "riskLevel" INTEGER DEFAULT 2;

-- AlterTable
ALTER TABLE "Liability" ADD COLUMN "isPriority" BOOLEAN DEFAULT false;
ALTER TABLE "Liability" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "Snapshot" ADD COLUMN "cashFlow" REAL;
ALTER TABLE "Snapshot" ADD COLUMN "savingsRate" REAL;

-- CreateTable
CREATE TABLE "AssetAllocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "stocks" REAL,
    "bonds" REAL,
    "cash" REAL,
    "realEstate" REAL,
    "other" REAL,
    CONSTRAINT "AssetAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "deadline" DATETIME NOT NULL,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentValue" REAL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "goalId" INTEGER NOT NULL,
    "target" REAL NOT NULL,
    "deadline" DATETIME NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "Milestone_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "planned" REAL NOT NULL,
    "actual" REAL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "Income" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "notes" TEXT,
    CONSTRAINT "Income_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "budgetId" INTEGER,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" TEXT,
    "notes" TEXT,
    CONSTRAINT "Expense_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "Snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "riskTolerance" INTEGER NOT NULL,
    "targetStocks" REAL,
    "targetBonds" REAL,
    "targetCash" REAL,
    "targetRealEstate" REAL,
    "targetOther" REAL,
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetAllocation_assetId_key" ON "AssetAllocation"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_year_month_category_key" ON "Budget"("year", "month", "category");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_year_month_key" ON "RiskProfile"("year", "month");
