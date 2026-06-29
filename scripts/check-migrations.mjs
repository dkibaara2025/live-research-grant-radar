import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "src", "db", "migrations");

if (!existsSync(migrationsDir)) {
  throw new Error("Missing src/db/migrations directory.");
}

const migrations = readdirSync(migrationsDir).filter((file) =>
  file.endsWith(".sql"),
);

if (migrations.length === 0) {
  throw new Error("No SQL migration files found.");
}

console.log(`Found ${migrations.length} checked-in SQL migration file(s).`);
