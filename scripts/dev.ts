/**
 * Development server: builds the site unminified, serves it with the real API, and rebuilds when sources change.
 * Reload the browser after a rebuild (no hot-module reloading, by design: one fewer moving part).
 */
import { watch } from 'node:fs';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { buildSite } from './build';
import { createAppServer } from '../server/app';
import { loadConfig } from '../server/config';
import { openWaitlistStore } from '../server/db';

const root = path.resolve(import.meta.dirname, '..');
if (existsSync(path.join(root, '.env'))) loadEnvFile(path.join(root, '.env'));

await buildSite({ minify: false });
const config = loadConfig();
const store = openWaitlistStore(config.dbPath);
const server = createAppServer(config, store);
server.listen(config.port, config.host, () => console.log(`Dev server: http://${config.host}:${config.port}`));

let timer: NodeJS.Timeout | undefined;
let building = false;
const rebuild = (): void => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (building) return;
    building = true;
    try { await buildSite({ minify: false, quiet: true }); console.log('Rebuilt.'); }
    catch (e) { console.error('Build failed:', e instanceof Error ? e.message : e); }
    finally { building = false; }
  }, 150);
};
for (const dir of ['src', 'shared', 'public']) watch(path.join(root, dir), { recursive: true }, rebuild);
