import { execSync } from 'node:child_process';

/**
 * Brings the e2e schema up to date with the committed migrations. `migrate deploy`
 * only applies pending migrations and never drops data; each suite clears the rows
 * it needs before it runs.
 */
export default function setup(): void {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env['E2E_DATABASE_URL'] },
    stdio: 'pipe',
  });
}
