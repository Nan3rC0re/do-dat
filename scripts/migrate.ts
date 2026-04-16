import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set in .env.local')
  process.exit(1)
}

async function migrate() {
  const client = postgres(connectionString!, { prepare: false })

  try {
    // Read and run the migration file
    const sql = readFileSync(join(process.cwd(), 'drizzle/0001_priority_tags.sql'), 'utf-8')

    console.log('Running migration: 0001_priority_tags.sql ...')
    await client.unsafe(sql)
    console.log('✓ Migration complete')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

migrate()
