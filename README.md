# Net Worth Tracker

An opinionated Next.js app for tracking assets and liabilities with inline editing, infinite scrolling, filtering, and CSV import. Built with the Next.js App Router, Prisma (SQLite by default), and server actions.

## Features

- Assets and Liabilities management
  - Add, edit (inline), and delete entries
  - Columns: 
    - Assets: name, category, value, growthRate, monthlyContribution
    - Liabilities: name, category, balance, interestRate, monthlyPayment, termMonths
- Infinite scrolling lists with IntersectionObserver
- Clickable table headers for server-side sorting
- Inline editable cells
  - Click to edit, auto-submit on blur or Enter
  - Number inputs use sensible steps (0.01 for currency/percent, 1 for months)
- Filtering with URL query parameters
  - Search by name/category
  - Min/max numeric filters
  - Order, page size
  - Column visibility toggles persisted via the URL
- CSV import for bulk add
- High-contrast UI, hover row highlights, clear input borders

## Tech Stack

- Next.js App Router (React Server Components)
- Prisma ORM
- SQLite (default) via `DATABASE_URL`
- Tailwind CSS (utility classes)

## Getting Started

### Prerequisites
- Node.js 18+ (or 20+)
- pnpm, npm, or yarn

### 1) Install dependencies

- pnpm install
- npm install
- yarn

### 2) Configure environment

Create a `.env` file in the project root:

DATABASE_URL="file:./dev.db"

You can switch to another database provider later (see Prisma section below).

### 3) Initialize the database

Generate the Prisma client and run initial migrations:

- npx prisma generate
- npx prisma migrate dev --name init

This creates `dev.db` (SQLite) locally.

### 4) Run the dev server

- npm run dev
- pnpm dev
- yarn dev

Open http://localhost:3000.

## Usage

### Assets
- Add an asset via the “Add Asset” form.
- Use the table to:
  - Click a cell to edit inline, press Enter or blur to save.
  - Delete an item with the Delete action.
  - Sort by clicking column headers.
  - Filter using the form above the table. Click Clear to reset.
- Infinite scrolling loads more items as you reach the end of the list.

### Liabilities
- Similar to Assets; fields are specific to liabilities.
- Columns include balance (currency), interestRate (% APR), monthlyPayment, termMonths.

### CSV Import
- Assets CSV header: `name,category,value,growthRate,monthlyContribution`
- Liabilities CSV header: `name,category,balance,interestRate,monthlyPayment,termMonths`
- Values are parsed as numbers where applicable; empty values become null.

## Serialization and Decimals

Prisma Decimal and Date fields are serialized on the server before being passed to the client components and API responses:
- Decimal-like fields (e.g., value, balance, monthlyContribution, monthlyPayment) are returned as JavaScript numbers.
- Date fields (createdAt, updatedAt) are returned as ISO strings.

## Project Structure

- app/src/app/assets/page.tsx — Assets page (server component)
- app/src/app/liabilities/page.tsx — Liabilities page (server component)
- app/src/components/EditableCell.tsx — Inline editable cell (client component)
- app/src/components/InfiniteTable.tsx — Infinite scrolling table (client component)
- app/src/app/api/liabilities/list/route.ts — Paginated liabilities API
- prisma schema: app/prisma/schema.prisma

Note: Paths are relative to the repository layout in this project; your editor may display absolute paths.

## Prisma and Database

The default Prisma datasource is SQLite. To change currency defaults, see the `Asset` model in `app/prisma/schema.prisma`. Example:

model Asset {
  id                  Int      @id @default(autoincrement())
  name                String
  category            String
  value               Decimal
  currency            String  @default("USD") // change to "SEK" if preferred
  growthRate          Float?
  monthlyContribution Decimal?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

If you change the Prisma schema:

- npx prisma migrate dev --name <change_name>

## Deployment

- Ensure `DATABASE_URL` is set in your deployment environment.
- For SQLite, use a persistent disk. For serverless providers, consider switching to a managed Postgres/MySQL and update `datasource db` in schema.prisma accordingly.
- After deploy, run `prisma migrate deploy` against the production database.

## Scripts (common)

- dev: Start the Next.js dev server
- build: Build the app for production
- start: Start the production server
- prisma:generate: Generate Prisma client
- prisma:migrate: Create and apply a new migration

Your actual scripts depend on package.json; adjust accordingly.

## Accessibility and UX

- High-contrast text and inputs
- Row hover highlighting
- Clear helper text for growth and contributions
- Non-blocking inline edits (save on blur/enter)

## Roadmap / Ideas

- Toast notifications for create/update/delete success
- Confirmation dialogs for destructive actions
- Global currency settings and formatting helpers (SEK, USD, etc.)
- Snapshots with charts for net worth over time
- Authentication and multi-user support

## Contributing

- Open an issue or PR with a clear description of the change.
- Keep UI consistent with existing patterns and class names.
- When touching the schema, include a migration.

## License

This project is licensed under the MIT License. See LICENSE.md for details.

