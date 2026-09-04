// Applies db/schema.sql to the database in DATABASE_URL.
//
// Exists because the schema is not reachable with the plain `neon()` HTTP
// helper: that runs one statement per call, while schema.sql is a multi
// statement file containing `do $$ ... $$` blocks. `Pool` speaks the real
// wire protocol over a WebSocket and handles both.
//
// The file is written to be re-runnable (create if not exists / or replace),
// so applying it twice is not an error.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Pool } from '@neondatabase/serverless';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'db', 'schema.sql');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    'DATABASE_URL is not set.\n\n' +
      'Add your Neon pooled connection string to .env.local, then re-run.\n' +
      'Neon dashboard -> your project -> Connect -> copy the "Pooled connection" string.',
  );
  process.exit(1);
}

const schema = await readFile(schemaPath, 'utf8');
const pool = new Pool({ connectionString });

try {
  await pool.query(schema);
  console.log('Applied db/schema.sql');

  const { rows } = await pool.query(
    `select table_name
       from information_schema.tables
      where table_schema = 'public'
      order by table_name`,
  );
  console.log('Tables now present: ' + rows.map((row) => row.table_name).join(', '));
} catch (error) {
  console.error('Failed to apply schema:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
