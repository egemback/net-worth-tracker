/*
  Warnings:

  - You are about to drop the `AssetAllocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AssetAllocation";
PRAGMA foreign_keys=on;
