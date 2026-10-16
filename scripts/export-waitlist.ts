/** Writes the waitlist to CSV on stdout:  npm run waitlist:export > waitlist.csv */
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { loadConfig } from '../server/config';
import { openWaitlistStore } from '../server/db';

if (existsSync('.env')) loadEnvFile('.env');
const store = openWaitlistStore(loadConfig().dbPath);

const cols = ['id', 'email', 'name', 'country', 'interest', 'message', 'marketing_opt_in', 'research_opt_in', 'consent_version', 'created_at', 'updated_at', 'submissions'] as const;
// Prefix cells that start with a formula character so spreadsheet software never executes user input.
const cell = (v: unknown): string => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
console.log(cols.join(','));
for (const row of store.all()) console.log(cols.map((c) => cell(row[c])).join(','));
store.close();
