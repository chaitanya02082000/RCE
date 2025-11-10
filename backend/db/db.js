import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as schema from "./schema.js";

// Load environment variables
dotenv.config();

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined in .env file");
}

console.log(
  "✅ DATABASE_URL loaded:",
  process.env.DATABASE_URL.substring(0, 30) + "...",
);

// Create Neon client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance with schema
export const db = drizzle({ client: sql, schema });
