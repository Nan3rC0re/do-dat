import type { Config } from 'drizzle-kit'
import 'dotenv/config'

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  connectionString: process.env.DATABASE_URL!,
} satisfies Config
