import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const migrationsDir = join(process.cwd(), "src", "db", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (migrations.length === 0) {
  throw new Error("No SQL migration files found.");
}

const sql = neon(databaseUrl);

for (const migration of migrations) {
  const filePath = join(migrationsDir, migration);
  const contents = readFileSync(filePath, "utf8");

  console.log(`Applying ${migration}`);

  const statements = contents
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }
}

console.log("Migrations complete.");

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) {
      continue;
    }

    const contents = readFileSync(file, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const index = trimmed.indexOf("=");

      if (index === -1) {
        continue;
      }

      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^"|"$/g, "");

      process.env[key] = process.env[key] ?? value;
    }
  }
}