// drizzle-kit writes `"public".` before type and table names. Removing it lets the same
// migrations build any schema, such as the tests' own; each connection's search_path
// decides where they go. Runs after every `drizzle-kit generate` (npm run db:new-migration).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const folder = new URL('../drizzle/', import.meta.url);
for (const file of readdirSync(folder).filter((name) => name.endsWith('.sql'))) {
  const path = new URL(file, folder);
  const sql = readFileSync(path, 'utf8');
  const unqualified = sql.replaceAll('"public".', '');
  if (unqualified !== sql) writeFileSync(path, unqualified);
}
