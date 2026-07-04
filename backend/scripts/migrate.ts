import 'dotenv/config';
import { Client } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

// Migrations run multi-statement SQL scripts (BEGIN ... COMMIT), which the HTTP-mode
// neon() query function doesn't support — use the WebSocket Client instead.
async function migrate() {
  const client = new Client(process.env.DATABASE_URL!);
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await client.query('SELECT filename FROM _migrations');
    const appliedSet = new Set(applied.rows.map((r: any) => r.filename));

    const dir = path.join(__dirname, '../db/migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;
      console.log(`Applying migration: ${file}`);
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(content);
      await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      console.log(`Applied: ${file}`);
    }

    console.log('Migrations complete.');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
