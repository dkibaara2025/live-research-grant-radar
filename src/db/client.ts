import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return null;
  }

  const sql = neon(url);
  return drizzle(sql, { schema });
}

export async function pingDatabase() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    return {
      configured: false,
      ok: false,
    };
  }

  try {
    const sql = neon(url);
    await sql`select 1 as ok`;

    return {
      configured: true,
      ok: true,
    };
  } catch {
    return {
      configured: true,
      ok: false,
    };
  }
}
