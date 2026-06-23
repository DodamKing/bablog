import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js와 동일하게 .env.local 을 우선 로드 (drizzle-kit은 CLI라 기본은 .env 만 읽음).
config({ path: ".env.local" });

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
